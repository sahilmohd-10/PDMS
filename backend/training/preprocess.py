"""
HIRS Data Preprocessing & Feature Engineering Pipeline
Processes Dataset.csv, derives clean features, builds candidate catalogue,
and produces stratified train/val/test splits saved in Parquet.
"""
import os
import re
import sys
import json
import time
import polars as pl
import numpy as np

def extract_cpu_brand(cpu_str):
    if not cpu_str:
        return "Unknown"
    s = cpu_str.upper()
    if "AMD" in s:
        return "AMD"
    if "INTEL" in s:
        return "Intel"
    return "Other"

def extract_cpu_family(cpu_str):
    if not cpu_str:
        return "Unknown"
    s = str(cpu_str)
    patterns = [
        (r"Ryzen\s*9", "Ryzen 9"),
        (r"Ryzen\s*7", "Ryzen 7"),
        (r"Ryzen\s*5", "Ryzen 5"),
        (r"Ryzen\s*3", "Ryzen 3"),
        (r"Core\s*i9", "Core i9"),
        (r"Core\s*i7", "Core i7"),
        (r"Core\s*i5", "Core i5"),
        (r"Core\s*i3", "Core i3"),
        (r"Xeon", "Xeon"),
        (r"Pentium", "Pentium"),
        (r"Celeron", "Celeron"),
        (r"Athlon", "Athlon"),
        (r"EPYC", "EPYC"),
        (r"Core\s*2\s*Quad", "Core 2 Quad")
    ]
    for pat, fam in patterns:
        if re.search(pat, s, re.IGNORECASE):
            return fam
    return "Standard"

def extract_gpu_brand(gpu_str):
    if not gpu_str:
        return "Unknown"
    s = gpu_str.upper()
    if "NVIDIA" in s or "GEFORCE" in s or "RTX" in s or "GTX" in s or "QUADRO" in s:
        return "NVIDIA"
    if "AMD" in s or "RADEON" in s:
        return "AMD"
    if "INTEL" in s or "ARC" in s:
        return "Intel"
    if "ASUS" in s or "MSI" in s or "GIGABYTE" in s or "ZOTAC" in s or "EVGA" in s or "ASROCK" in s:
        # Check specific chips
        if re.search(r"RTX|GTX|\bGT\b|TITAN", s):
            return "NVIDIA"
        if re.search(r"\bRX\b|RADEON|R9|R7|R5", s):
            return "AMD"
        return "NVIDIA" # predominant add-in board partner
    return "Other"

def extract_clean_cpu_name(cpu_str):
    if not cpu_str:
        return "Unknown CPU"
    parts = [p.strip() for p in cpu_str.split("|")]
    if len(parts) >= 2:
        return parts[1]
    return cpu_str.strip()

def extract_clean_gpu_name(gpu_str):
    if not gpu_str:
        return "Integrated Graphics"
    parts = [p.strip() for p in gpu_str.split("|")]
    return parts[0]

def run_preprocessing(
    csv_path=r"d:\Downloads\PDMS\Dataset.csv",
    artifacts_dir=r"d:\Downloads\PDMS\backend\artifacts",
    sample_for_training=None # set to int if downsampling for rapid iteration, else None for full dataset
):
    os.makedirs(artifacts_dir, exist_ok=True)
    start_time = time.time()
    print(f"[*] Loading raw dataset from {csv_path}...")
    
    df = pl.read_csv(
        csv_path,
        schema_overrides={
            "CPU": pl.Utf8, "RAM": pl.Utf8, "SSD": pl.Utf8,
            "GRAPHICS": pl.Utf8, "PRICE": pl.Float64, "BUY": pl.Int64
        },
        truncate_ragged_lines=True
    )
    print(f"[+] Loaded {df.shape[0]:,} rows.")
    
    # 1. Clean feature extraction
    print("[*] Extracting structured features...")
    df = df.with_columns([
        # Device Type
        pl.when(pl.col("CPU").str.starts_with("Desktop"))
        .then(pl.lit("Desktop"))
        .when(pl.col("CPU").str.starts_with("Laptop"))
        .then(pl.lit("Laptop"))
        .otherwise(pl.lit("Desktop"))
        .alias("device_type"),
        
        # Cores
        pl.col("CPU").str.extract(r"(\d+)\s*cores?", 1).cast(pl.Int64, strict=False).fill_null(4).alias("cores"),
        
        # RAM GB
        pl.col("RAM").str.extract(r"^(\d+)\s*GB", 1).cast(pl.Int64, strict=False).fill_null(16).alias("ram_gb"),
        
        # SSD GB
        pl.col("SSD").str.extract(r"^(\d+)\s*GB", 1).cast(pl.Int64, strict=False).fill_null(512).alias("ssd_gb"),
        
        # VRAM GB
        pl.col("GRAPHICS").str.extract(r"VRAM\s+(\d+)\s*GB", 1).cast(pl.Int64, strict=False).fill_null(0).alias("vram_gb"),
        
        # RAM generation
        pl.when(pl.col("RAM").str.contains("DDR5"))
        .then(pl.lit("DDR5"))
        .when(pl.col("RAM").str.contains("DDR4"))
        .then(pl.lit("DDR4"))
        .otherwise(pl.lit("DDR4"))
        .alias("ram_type"),
        
        # Integrated GPU indicator
        pl.col("GRAPHICS").str.contains("(?i)integrated").cast(pl.Int64).alias("is_integrated")
    ])
    
    # Clean text names and brand derivations
    cpu_list = df["CPU"].to_list()
    gpu_list = df["GRAPHICS"].to_list()
    
    cpu_clean = [extract_clean_cpu_name(x) for x in cpu_list]
    cpu_brands = [extract_cpu_brand(x) for x in cpu_list]
    cpu_families = [extract_cpu_family(x) for x in cpu_list]
    
    gpu_clean = [extract_clean_gpu_name(x) for x in gpu_list]
    gpu_brands = [extract_gpu_brand(x) for x in gpu_list]
    
    df = df.with_columns([
        pl.Series("cpu_clean", cpu_clean),
        pl.Series("cpu_brand", cpu_brands),
        pl.Series("cpu_family", cpu_families),
        pl.Series("gpu_clean", gpu_clean),
        pl.Series("gpu_brand", gpu_brands),
    ])
    
    # Feature Engineering (economic and specification ratios)
    print("[*] Computing derived engineering features...")
    df = df.with_columns([
        (pl.col("PRICE") / pl.col("cores").clip(lower_bound=1)).round(2).alias("price_per_core"),
        (pl.col("PRICE") / pl.col("ram_gb").clip(lower_bound=1)).round(2).alias("price_per_ram_gb"),
        (pl.col("PRICE") / pl.col("vram_gb").clip(lower_bound=1)).round(2).alias("price_per_vram_gb"),
        (pl.col("ssd_gb") / pl.col("ram_gb").clip(lower_bound=1)).round(2).alias("storage_to_ram_ratio"),
        
        # Normalized hardware capability score (0 to 100)
        (
            (pl.col("cores") / 24.0) * 30.0 +
            (pl.col("ram_gb").clip(upper_bound=128) / 128.0) * 25.0 +
            (pl.col("ssd_gb").clip(upper_bound=4000) / 4000.0) * 15.0 +
            (pl.col("vram_gb").clip(upper_bound=24) / 24.0) * 30.0
        ).round(2).alias("hardware_score")
    ])
    
    df = df.with_columns([
        # Value-for-money score: hardware_score relative to price (₹100k benchmark)
        (pl.col("hardware_score") / (pl.col("PRICE") / 100000.0)).round(2).alias("value_score")
    ])
    
    # Save full cleaned dataset to Parquet
    full_parquet_path = os.path.join(artifacts_dir, "hardware_clean.parquet")
    df.write_parquet(full_parquet_path)
    print(f"[+] Saved full clean dataset to {full_parquet_path} ({round(os.path.getsize(full_parquet_path)/(1024*1024), 2)} MB)")
    
    # 2. Build Recommendation Product Catalogue (representative unique configs)
    # Deduplicate by components keeping lowest price
    print("[*] Building unique hardware catalogue for real-time recommendation...")
    catalogue = (
        df.group_by(["cpu_clean", "ram_gb", "ssd_gb", "gpu_clean", "device_type"])
        .agg([
            pl.col("PRICE").min().alias("price"),
            pl.col("cores").first().alias("cores"),
            pl.col("vram_gb").first().alias("vram_gb"),
            pl.col("cpu_brand").first().alias("cpu_brand"),
            pl.col("cpu_family").first().alias("cpu_family"),
            pl.col("gpu_brand").first().alias("gpu_brand"),
            pl.col("ram_type").first().alias("ram_type"),
            pl.col("hardware_score").first().alias("hardware_score"),
            pl.col("value_score").first().alias("value_score"),
            pl.col("BUY").max().alias("has_buy_label"),
            pl.col("CPU").first().alias("raw_cpu"),
            pl.col("RAM").first().alias("raw_ram"),
            pl.col("SSD").first().alias("raw_ssd"),
            pl.col("GRAPHICS").first().alias("raw_gpu")
        ])
        .sort("price")
    )
    catalogue_path = os.path.join(artifacts_dir, "catalogue.parquet")
    catalogue.write_parquet(catalogue_path)
    print(f"[+] Saved candidate catalogue with {catalogue.shape[0]:,} unique configurations to {catalogue_path}")
    
    # 3. Stratified Train / Val / Test Split (70% / 15% / 15%)
    print("[*] Generating stratified train/val/test splits...")
    np.random.seed(42)
    
    # Use 200,000 stratified samples for ultra-fast, robust model training and benchmarking
    # (1M rows can also be fully used, but 200k preserves statistical power and runs within seconds)
    TRAIN_SAMPLE_SIZE = 250000
    if df.shape[0] > TRAIN_SAMPLE_SIZE:
        print(f"[*] Sampling {TRAIN_SAMPLE_SIZE:,} stratified records for model training...")
        buy_ones = df.filter(pl.col("BUY") == 1)
        buy_zeros = df.filter(pl.col("BUY") == 0)
        
        sample_ones = buy_ones.sample(n=min(buy_ones.shape[0], int(TRAIN_SAMPLE_SIZE * 0.10)), seed=42)
        sample_zeros = buy_zeros.sample(n=TRAIN_SAMPLE_SIZE - sample_ones.shape[0], seed=42)
        working_df = pl.concat([sample_ones, sample_zeros]).sample(fraction=1.0, shuffle=True, seed=42)
    else:
        working_df = df.sample(fraction=1.0, shuffle=True, seed=42)
        
    n_total = working_df.shape[0]
    n_train = int(n_total * 0.70)
    n_val = int(n_total * 0.15)
    
    train_df = working_df.slice(0, n_train)
    val_df = working_df.slice(n_train, n_val)
    test_df = working_df.slice(n_train + n_val)
    
    train_path = os.path.join(artifacts_dir, "train.parquet")
    val_path = os.path.join(artifacts_dir, "val.parquet")
    test_path = os.path.join(artifacts_dir, "test.parquet")
    
    train_df.write_parquet(train_path)
    val_df.write_parquet(val_path)
    test_df.write_parquet(test_path)
    
    print(f"[+] Splits saved: Train={train_df.shape[0]:,}, Val={val_df.shape[0]:,}, Test={test_df.shape[0]:,}")
    print(f"    Train BUY rate: {train_df['BUY'].mean()*100:.2f}%")
    print(f"    Val BUY rate:   {val_df['BUY'].mean()*100:.2f}%")
    print(f"    Test BUY rate:  {test_df['BUY'].mean()*100:.2f}%")
    
    meta = {
        "total_raw_rows": df.shape[0],
        "catalogue_unique_configs": catalogue.shape[0],
        "train_rows": train_df.shape[0],
        "val_rows": val_df.shape[0],
        "test_rows": test_df.shape[0],
        "features": [
            "cores", "ram_gb", "ssd_gb", "vram_gb", "PRICE",
            "price_per_core", "price_per_ram_gb", "price_per_vram_gb",
            "storage_to_ram_ratio", "hardware_score", "value_score",
            "device_type", "cpu_brand", "cpu_family", "gpu_brand", "ram_type"
        ],
        "duration_seconds": round(time.time() - start_time, 2)
    }
    with open(os.path.join(artifacts_dir, "preprocess_metadata.json"), "w") as f:
        json.dump(meta, f, indent=2)
    print(f"[+] Preprocessing complete in {meta['duration_seconds']}s")

if __name__ == "__main__":
    run_preprocessing()
