#!/usr/bin/env python3
"""
Thesis revision management tool for Tri-CertFramework docs.

Usage:
    ./thesis.py init             Initialize thesis source directory structure
    ./thesis.py build            Build thesis from source and create new revision
    ./thesis.py major            Increment major version (1.x → 2.0)
    ./thesis.py list             List all revisions
    ./thesis.py tree             Show source directory structure
    ./thesis.py show <version>   Show details of a specific revision
    ./thesis.py remove <version> Remove a revision
    ./thesis.py split            Split existing thesis into source structure

Requirements:
    Python 3.8+ (standard library only, no external dependencies)

Examples:
    ./thesis.py init             # Create initial directory structure
    ./thesis.py build            # Build v1.3 from source
    ./thesis.py major            # Create v2.0
    ./thesis.py tree             # Show thesis source structure
"""

import argparse
import configparser
import re
import shutil
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional


# =============================================================================
# Configuration
# =============================================================================

SCRIPT_DIR = Path(__file__).parent
DOCS_DIR = SCRIPT_DIR.parent
CONFIG_FILE = SCRIPT_DIR / "thesis.config"

# These are loaded from config
SOURCE_DIR: Path = DOCS_DIR / "thesis-source"
RESEARCH_DIR: Path = DOCS_DIR / "src" / "content" / "docs" / "research"
INDEX_FILE: Path = RESEARCH_DIR / "index.md"
ASTRO_CONFIG: Path = DOCS_DIR / "astro.config.mjs"

THESIS_FILE_PATTERN = re.compile(r"thesis-v(\d+)-(\d+)\.md")
VERSION_PATTERN = re.compile(r"v?(\d+)[.-](\d+)")
SECTION_PATTERN = re.compile(r"^(\d+(?:\.\d+)*)\s+(.+)$")


# =============================================================================
# Config Management
# =============================================================================

def load_config() -> configparser.ConfigParser:
    """Load configuration from thesis.config."""
    config = configparser.ConfigParser()
    
    if CONFIG_FILE.exists():
        config.read(CONFIG_FILE, encoding="utf-8")
    else:
        # Create default config
        config["version"] = {"major": "1", "minor": "0"}
        config["metadata"] = {
            "title": "修士論文",
            "subtitle": "文書の真正性検証フレームワークの設計と実装",
            "description": "ゼロ知識証明を用いた分散型証明システム Tri-CertFramework",
        }
        config["paths"] = {
            "source_dir": "thesis-source",
            "output_dir": "src/content/docs/research",
        }
        save_config(config)
    
    return config


def save_config(config: configparser.ConfigParser) -> None:
    """Save configuration to thesis.config."""
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        f.write("# Thesis Management Configuration\n")
        f.write("# This file is managed by thesis.py\n\n")
        config.write(f)


def get_current_version(config: configparser.ConfigParser) -> tuple[int, int]:
    """Get current version from config."""
    return (
        config.getint("version", "major"),
        config.getint("version", "minor"),
    )


def set_version(config: configparser.ConfigParser, major: int, minor: int) -> None:
    """Set version in config."""
    config.set("version", "major", str(major))
    config.set("version", "minor", str(minor))
    save_config(config)


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class SourceFile:
    """Represents a source file in the thesis structure."""
    path: Path
    number: str  # e.g., "1.2.3" or ""
    title: str
    level: int   # 0=frontmatter, 1=chapter, 2=section, 3=subsection
    content: str = ""
    
    @property
    def sort_key(self) -> tuple:
        """Key for sorting files in order."""
        if not self.number:
            # Special files sort by name
            special_order = {
                "_frontmatter": (0, 0, 0, 0),
                "_toc": (0, 0, 0, 1),
                "謝辞": (999, 0, 0, 0),
                "参考文献": (999, 0, 0, 1),
                "付録": (999, 0, 0, 2),
            }
            for key, order in special_order.items():
                if key in self.path.stem:
                    return order
            return (998, 0, 0, 0)
        
        parts = [int(p) for p in self.number.split(".")]
        while len(parts) < 4:
            parts.append(0)
        return tuple(parts)


@dataclass
class Revision:
    """Represents a thesis revision."""
    major: int
    minor: int
    file_path: Path
    is_current: bool = False
    title: str = ""
    
    @property
    def version(self) -> str:
        return f"{self.major}.{self.minor}"
    
    @property
    def slug(self) -> str:
        return f"thesis-v{self.major}-{self.minor}"
    
    @property
    def filename(self) -> str:
        return f"{self.slug}.md"
    
    def __lt__(self, other: "Revision") -> bool:
        return (self.major, self.minor) < (other.major, other.minor)


# =============================================================================
# Source Directory Functions
# =============================================================================

def get_source_dir(config: configparser.ConfigParser) -> Path:
    """Get source directory from config."""
    return DOCS_DIR / config.get("paths", "source_dir")


def parse_dir_or_file_name(name: str) -> tuple[str, str]:
    """Parse directory or file name to extract number and title."""
    # Remove .md extension if present
    name = name.replace(".md", "")
    
    # Try to match section pattern (e.g., "1.2.3 Title")
    match = SECTION_PATTERN.match(name)
    if match:
        return match.group(1), match.group(2)
    
    # Try to match chapter pattern (e.g., "第1章 Title")
    chapter_match = re.match(r"第(\d+)章\s+(.+)", name)
    if chapter_match:
        return chapter_match.group(1), chapter_match.group(2)
    
    return "", name


def collect_source_files(source_dir: Path) -> list[SourceFile]:
    """Collect all source files from the thesis directory structure."""
    files = []
    
    if not source_dir.exists():
        return files
    
    def process_path(path: Path, level: int = 0) -> None:
        if path.is_file() and path.suffix == ".md":
            number, title = parse_dir_or_file_name(path.stem)
            content = path.read_text(encoding="utf-8")
            files.append(SourceFile(
                path=path,
                number=number,
                title=title,
                level=level,
                content=content,
            ))
        elif path.is_dir():
            # Process directory itself (for chapter headers)
            dir_number, dir_title = parse_dir_or_file_name(path.name)
            
            # Check for _chapter.md or _section.md
            header_file = path / "_section.md"
            if not header_file.exists():
                header_file = path / "_chapter.md"
            
            if header_file.exists():
                content = header_file.read_text(encoding="utf-8")
                files.append(SourceFile(
                    path=header_file,
                    number=dir_number,
                    title=dir_title,
                    level=level,
                    content=content,
                ))
            
            # Process children
            children = sorted(path.iterdir(), key=lambda p: (
                0 if p.name.startswith("_") else 1,
                p.name,
            ))
            for child in children:
                if child.name.startswith("_"):
                    continue  # Already processed
                if child.name.startswith("."):
                    continue  # Skip hidden
                process_path(child, level + 1)
    
    # Process all items in source directory
    for item in sorted(source_dir.iterdir()):
        if item.name.startswith("."):
            continue
        process_path(item, 0 if item.is_file() else 1)
    
    # Sort by section number
    files.sort(key=lambda f: f.sort_key)
    
    return files


def build_thesis_content(files: list[SourceFile], config: configparser.ConfigParser) -> str:
    """Build complete thesis content from source files."""
    parts = []
    
    for f in files:
        content = f.content.strip()
        
        # Skip empty files
        if not content:
            continue
        
        # Add appropriate heading if not already present
        if f.number and not content.startswith("#"):
            if f.level == 1:
                # Chapter
                heading = f"# 第{f.number}章 {f.title}"
            elif f.level == 2:
                # Section
                heading = f"## {f.number} {f.title}"
            elif f.level == 3:
                # Subsection
                heading = f"### {f.number} {f.title}"
            else:
                heading = f"#### {f.number} {f.title}"
            
            content = f"{heading}\n\n{content}"
        
        parts.append(content)
    
    return "\n\n---\n\n".join(parts)


# =============================================================================
# Init Command
# =============================================================================

def init_source_structure(config: configparser.ConfigParser) -> None:
    """Initialize the thesis source directory structure."""
    source_dir = get_source_dir(config)
    
    if source_dir.exists():
        print(f"Source directory already exists: {source_dir}")
        response = input("Do you want to reset it? This will delete existing content. [y/N]: ")
        if response.lower() != "y":
            print("Cancelled.")
            return
        shutil.rmtree(source_dir)
    
    print(f"Creating thesis source structure at {source_dir}...")
    
    # Create directory structure
    structure = {
        "_frontmatter.md": """# 修士論文

## 文書の真正性検証フレームワークの設計と実装
### ゼロ知識証明を用いた分散型証明システム Tri-CertFramework

神戸情報大学院大学
情報技術研究科 情報システム専攻

学籍番号：XXXXX
氏名：XXXXX

提出日：20XX年X月X日
""",
        "第1章 序論/1.1 研究の背景.md": """
私たちの社会は、様々な「文書」の信頼性に支えられている。

（ここに内容を記述）
""",
        "第1章 序論/1.2 真正性検証とは.md": """
本研究における「真正性検証」とは、以下の3つの要素を確認するプロセスを指す。

（ここに内容を記述）
""",
        "第2章 先行研究と技術基盤/2.1 デジタル証明書の現状.md": """
現在、デジタル証明書の代表的な規格としてX.509証明書が広く使用されている。

（ここに内容を記述）
""",
        "謝辞.md": """# 謝辞

本研究は、神戸情報大学院大学情報技術研究科情報システム専攻において実施しました。

（ここに謝辞を記述）
""",
        "参考文献.md": """# 参考文献

[1] 参考文献1
[2] 参考文献2
""",
    }
    
    for path_str, content in structure.items():
        file_path = source_dir / path_str
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_text(content.strip() + "\n", encoding="utf-8")
        print(f"  ✓ Created {path_str}")
    
    print(f"\n✅ Initialized thesis source structure")
    print(f"   Edit files in: {source_dir.relative_to(DOCS_DIR)}")
    print(f"   Then run: ./thesis.py build")


# =============================================================================
# Split Command
# =============================================================================

def split_existing_thesis(config: configparser.ConfigParser) -> None:
    """Split an existing thesis markdown into directory structure."""
    revisions = get_revisions()
    
    if not revisions:
        print("Error: No existing thesis revisions found.")
        print("Use './thesis.py init' to create a new structure.")
        sys.exit(1)
    
    # Get the current (latest) revision
    current = next((r for r in revisions if r.is_current), revisions[0])
    
    print(f"Splitting thesis v{current.version} into source structure...")
    
    source_dir = get_source_dir(config)
    if source_dir.exists():
        response = input(f"Source directory exists. Overwrite? [y/N]: ")
        if response.lower() != "y":
            print("Cancelled.")
            return
        shutil.rmtree(source_dir)
    
    source_dir.mkdir(parents=True)
    
    # Read thesis content
    content = current.file_path.read_text(encoding="utf-8")
    
    # Remove frontmatter
    if content.startswith("---"):
        end_match = re.search(r"\n---\n", content[3:])
        if end_match:
            content = content[end_match.end() + 3:].strip()
    
    # Split by chapters (# 第X章 or # Title)
    chapter_pattern = re.compile(r"^# (.+)$", re.MULTILINE)
    section_pattern = re.compile(r"^## (\d+\.\d+)\s+(.+)$", re.MULTILINE)
    subsection_pattern = re.compile(r"^### (\d+\.\d+\.\d+)\s+(.+)$", re.MULTILINE)
    
    # Find all chapters
    chapters = list(chapter_pattern.finditer(content))
    
    for i, chapter_match in enumerate(chapters):
        chapter_title = chapter_match.group(1)
        chapter_start = chapter_match.end()
        chapter_end = chapters[i + 1].start() if i + 1 < len(chapters) else len(content)
        chapter_content = content[chapter_start:chapter_end].strip()
        
        # Determine chapter number and directory name
        num_match = re.match(r"第(\d+)章\s+(.+)", chapter_title)
        if num_match:
            chapter_num = num_match.group(1)
            chapter_name = num_match.group(2)
            dir_name = f"第{chapter_num}章 {chapter_name}"
        else:
            # Special chapters like 謝辞, 参考文献
            if any(kw in chapter_title for kw in ["謝辞", "参考文献", "付録"]):
                file_path = source_dir / f"{chapter_title}.md"
                file_path.write_text(f"# {chapter_title}\n\n{chapter_content}\n", encoding="utf-8")
                print(f"  ✓ Created {chapter_title}.md")
                continue
            dir_name = chapter_title
            chapter_num = "0"
        
        chapter_dir = source_dir / dir_name
        chapter_dir.mkdir(exist_ok=True)
        
        # Find sections within this chapter
        sections = list(section_pattern.finditer(chapter_content))
        
        if sections:
            for j, section_match in enumerate(sections):
                section_num = section_match.group(1)
                section_title = section_match.group(2)
                section_start = section_match.end()
                section_end = sections[j + 1].start() if j + 1 < len(sections) else len(chapter_content)
                section_content = chapter_content[section_start:section_end].strip()
                
                # Check for subsections
                subsections = list(subsection_pattern.finditer(section_content))
                
                if subsections:
                    # Create section directory
                    section_dir = chapter_dir / f"{section_num} {section_title}"
                    section_dir.mkdir(exist_ok=True)
                    
                    for k, subsec_match in enumerate(subsections):
                        subsec_num = subsec_match.group(1)
                        subsec_title = subsec_match.group(2)
                        subsec_start = subsec_match.end()
                        subsec_end = subsections[k + 1].start() if k + 1 < len(subsections) else len(section_content)
                        subsec_content = section_content[subsec_start:subsec_end].strip()
                        
                        file_path = section_dir / f"{subsec_num} {subsec_title}.md"
                        file_path.write_text(subsec_content + "\n", encoding="utf-8")
                        print(f"  ✓ Created {file_path.relative_to(source_dir)}")
                else:
                    # No subsections, create section file
                    file_path = chapter_dir / f"{section_num} {section_title}.md"
                    file_path.write_text(section_content + "\n", encoding="utf-8")
                    print(f"  ✓ Created {file_path.relative_to(source_dir)}")
        else:
            # No sections, save whole chapter content
            file_path = chapter_dir / f"_chapter.md"
            file_path.write_text(chapter_content + "\n", encoding="utf-8")
            print(f"  ✓ Created {file_path.relative_to(source_dir)}")
    
    # Extract frontmatter
    original_content = current.file_path.read_text(encoding="utf-8")
    first_chapter = chapter_pattern.search(original_content)
    if first_chapter:
        frontmatter_content = original_content[:first_chapter.start()].strip()
        # Remove YAML frontmatter
        if frontmatter_content.startswith("---"):
            end_match = re.search(r"\n---\n", frontmatter_content[3:])
            if end_match:
                frontmatter_content = frontmatter_content[end_match.end() + 3:].strip()
        
        if frontmatter_content:
            fm_file = source_dir / "_frontmatter.md"
            fm_file.write_text(frontmatter_content + "\n", encoding="utf-8")
            print(f"  ✓ Created _frontmatter.md")
    
    print(f"\n✅ Split thesis into source structure")
    print(f"   Directory: {source_dir.relative_to(DOCS_DIR)}")
    print(f"   Run './thesis.py tree' to see the structure")


# =============================================================================
# Build Command
# =============================================================================

def build_thesis(config: configparser.ConfigParser) -> None:
    """Build thesis from source directory."""
    source_dir = get_source_dir(config)
    
    if not source_dir.exists():
        print(f"Error: Source directory not found: {source_dir}")
        print("Run './thesis.py init' to create the structure, or")
        print("Run './thesis.py split' to split an existing thesis.")
        sys.exit(1)
    
    # Collect source files
    files = collect_source_files(source_dir)
    
    if not files:
        print("Error: No source files found.")
        sys.exit(1)
    
    print(f"Building thesis from {len(files)} source files...")
    
    # Build content
    content = build_thesis_content(files, config)
    
    # Increment minor version
    major, minor = get_current_version(config)
    new_minor = minor + 1
    set_version(config, major, new_minor)
    
    new_rev = Revision(
        major=major,
        minor=new_minor,
        file_path=RESEARCH_DIR / f"thesis-v{major}-{new_minor}.md",
        is_current=True,
    )
    
    # Build frontmatter
    frontmatter = f'''---
title: "修士論文 v{new_rev.version}"
description: "{config.get('metadata', 'subtitle')} - {config.get('metadata', 'description')}"
tableOfContents:
  minHeadingLevel: 2
  maxHeadingLevel: 3
---

'''
    
    # Convert mermaid blocks
    content = re.sub(
        r"```mermaid\n(.*?)```",
        r'<pre class="mermaid">\n\1</pre>',
        content,
        flags=re.DOTALL,
    )
    
    # Write output
    new_rev.file_path.write_text(frontmatter + content, encoding="utf-8")
    print(f"  ✓ Created {new_rev.filename}")
    
    # Mark old revisions as past
    for rev in get_revisions():
        if rev.file_path != new_rev.file_path:
            mark_as_past_version(rev, new_rev)
    
    # Update index.md
    update_index_md_for_new_version(new_rev)
    print(f"  ✓ Updated index.md")
    
    # Update astro.config.mjs
    update_astro_config_for_new_version(new_rev)
    print(f"  ✓ Updated astro.config.mjs")
    
    print(f"\n✅ Built thesis v{new_rev.version}")
    print(f"   File: {new_rev.file_path.relative_to(DOCS_DIR)}")
    print(f"   Size: {new_rev.file_path.stat().st_size / 1024:.1f} KB")


# =============================================================================
# Major Version Command
# =============================================================================

def increment_major_version(config: configparser.ConfigParser) -> None:
    """Increment major version (e.g., 1.5 → 2.0)."""
    major, minor = get_current_version(config)
    new_major = major + 1
    
    print(f"Incrementing major version: {major}.{minor} → {new_major}.0")
    
    response = input("This will create a new major version. Continue? [y/N]: ")
    if response.lower() != "y":
        print("Cancelled.")
        return
    
    set_version(config, new_major, 0)
    print(f"\n✅ Set version to {new_major}.0")
    print("   Run './thesis.py build' to create the new revision.")


# =============================================================================
# Tree Command
# =============================================================================

def show_source_tree(config: configparser.ConfigParser) -> None:
    """Show the thesis source directory structure."""
    source_dir = get_source_dir(config)
    
    if not source_dir.exists():
        print(f"Source directory not found: {source_dir}")
        print("Run './thesis.py init' to create the structure.")
        return
    
    print(f"\n📁 Thesis Source Structure")
    print(f"   {source_dir.relative_to(DOCS_DIR)}/")
    print("=" * 60)
    
    def print_tree(path: Path, prefix: str = "") -> None:
        items = sorted(path.iterdir(), key=lambda p: (
            0 if p.name.startswith("_") else 1,
            not p.is_dir(),
            p.name,
        ))
        
        for i, item in enumerate(items):
            if item.name.startswith("."):
                continue
            
            is_last = i == len(items) - 1
            connector = "└── " if is_last else "├── "
            
            if item.is_dir():
                print(f"{prefix}{connector}📁 {item.name}/")
                new_prefix = prefix + ("    " if is_last else "│   ")
                print_tree(item, new_prefix)
            else:
                size = item.stat().st_size
                size_str = f"({size / 1024:.1f} KB)" if size > 1024 else f"({size} B)"
                print(f"{prefix}{connector}📄 {item.name} {size_str}")
    
    print_tree(source_dir)
    
    # Show stats
    files = collect_source_files(source_dir)
    print("\n" + "-" * 60)
    print(f"Total: {len(files)} source file(s)")


# =============================================================================
# Helper Functions for Revisions
# =============================================================================

def get_revisions() -> list[Revision]:
    """Get all thesis revisions sorted by version (descending)."""
    revisions = []
    
    if not RESEARCH_DIR.exists():
        return revisions
    
    for file_path in RESEARCH_DIR.glob("thesis-v*.md"):
        match = THESIS_FILE_PATTERN.match(file_path.name)
        if match:
            major, minor = int(match.group(1)), int(match.group(2))
            content = file_path.read_text(encoding="utf-8")
            
            is_current = "過去版" not in content[:500]
            
            title_match = re.search(r'title:\s*["\']?([^"\'\n]+)', content[:500])
            title = title_match.group(1) if title_match else ""
            
            revisions.append(Revision(
                major=major,
                minor=minor,
                file_path=file_path,
                is_current=is_current,
                title=title,
            ))
    
    revisions.sort(reverse=True)
    return revisions


def mark_as_past_version(rev: Revision, new_current: Revision) -> None:
    """Mark a revision as past version."""
    content = rev.file_path.read_text(encoding="utf-8")
    
    # Check if already marked
    if "過去版" in content[:500]:
        # Update link to new current
        content = re.sub(
            r"\[v[\d.]+\]\(\./thesis-v\d+-\d+/\)",
            f"[v{new_current.version}](./{new_current.slug}/)",
            content,
        )
        rev.file_path.write_text(content, encoding="utf-8")
        return
    
    # Add badge to frontmatter
    if content.startswith("---"):
        end_match = re.search(r"\n---\n", content[3:])
        if end_match:
            fm_end = end_match.end() + 3
            fm = content[4:end_match.start() + 3]
            body = content[fm_end:]
            
            # Add sidebar badge
            if "sidebar:" not in fm:
                fm += '\nsidebar:\n  badge:\n    text: "過去版"\n    variant: "caution"'
            
            # Add warning
            warning = f"""
:::caution[過去バージョン]
これは過去バージョン（v{rev.version}）です。最新版は [v{new_current.version}](./{new_current.slug}/) をご覧ください。
:::

"""
            if ":::caution[過去バージョン]" not in body:
                body = warning + body.lstrip()
            
            content = f"---\n{fm}\n---\n{body}"
            rev.file_path.write_text(content, encoding="utf-8")


def update_index_md_for_new_version(new_rev: Revision) -> None:
    """Update index.md with new version."""
    if not INDEX_FILE.exists():
        return
    
    content = INDEX_FILE.read_text(encoding="utf-8")
    
    # Update existing "最新" row to past version
    content = re.sub(
        r"\| \*\*v([\d.]+)\*\* \| 最新 \| 📗 現行版 \| \[論文を読む →\]\(\./thesis-v(\d+)-(\d+)/\) \|",
        r"| v\1 | - | 📕 過去版 | [論文を読む →](./thesis-v\2-\3/) |",
        content,
    )
    
    # Add new row
    new_row = f"| **v{new_rev.version}** | 最新 | 📗 現行版 | [論文を読む →](./{new_rev.slug}/) |"
    table_header = "|-----------|--------|------|--------|"
    content = content.replace(table_header, table_header + "\n" + new_row)
    
    INDEX_FILE.write_text(content, encoding="utf-8")


def update_astro_config_for_new_version(new_rev: Revision) -> None:
    """Update astro.config.mjs with new version."""
    if not ASTRO_CONFIG.exists():
        return
    
    content = ASTRO_CONFIG.read_text(encoding="utf-8")
    
    # Add new item after '論文一覧'
    new_item = f"            {{ label: '修士論文 v{new_rev.version}', slug: 'research/{new_rev.slug}', translations: {{ en: 'Thesis v{new_rev.version}' }} }},"
    
    pattern = r"(\{ label: '論文一覧'.*?\},)"
    match = re.search(pattern, content)
    
    if match:
        insert_pos = match.end()
        content = content[:insert_pos] + "\n" + new_item + content[insert_pos:]
        ASTRO_CONFIG.write_text(content, encoding="utf-8")


# =============================================================================
# List/Show/Remove Commands
# =============================================================================

def list_revisions() -> None:
    """List all thesis revisions."""
    revisions = get_revisions()
    
    if not revisions:
        print("No thesis revisions found.")
        return
    
    config = load_config()
    major, minor = get_current_version(config)
    
    print(f"\n📚 Thesis Revisions (config version: {major}.{minor})")
    print("=" * 70)
    print(f"{'Version':<10} {'Status':<12} {'Filename':<20} {'Size':<10}")
    print("-" * 70)
    
    for rev in revisions:
        status = "📗 Current" if rev.is_current else "📕 Past"
        size = rev.file_path.stat().st_size
        size_str = f"{size / 1024:.1f} KB"
        print(f"v{rev.version:<9} {status:<12} {rev.filename:<20} {size_str:<10}")
    
    print("-" * 70)
    print(f"Total: {len(revisions)} revision(s)")
    print()


def show_revision(version_str: str) -> None:
    """Show details of a specific revision."""
    try:
        major, minor = parse_version_string(version_str)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

    revisions = get_revisions()
    rev = next((r for r in revisions if r.major == major and r.minor == minor), None)
    
    if not rev:
        print(f"Error: Revision v{major}.{minor} not found.")
        sys.exit(1)
    
    content = rev.file_path.read_text(encoding="utf-8")
    
    h1_count = len(re.findall(r"^# ", content, re.MULTILINE))
    h2_count = len(re.findall(r"^## ", content, re.MULTILINE))
    mermaid_count = content.count('<pre class="mermaid">')
    
    print(f"\n📄 Thesis v{rev.version}")
    print("=" * 50)
    print(f"File:       {rev.file_path.relative_to(DOCS_DIR)}")
    print(f"Status:     {'📗 Current' if rev.is_current else '📕 Past'}")
    print(f"Size:       {rev.file_path.stat().st_size / 1024:.1f} KB")
    print(f"Lines:      {len(content.splitlines())}")
    print(f"Chapters:   {h1_count}")
    print(f"Sections:   {h2_count}")
    print(f"Mermaid:    {mermaid_count} diagram(s)")
    print()


def parse_version_string(version_str: str) -> tuple[int, int]:
    """Parse version from various formats: 1.2, v1.2, v1-2, thesis-v1-2.md, etc."""
    # Remove common prefixes and suffixes
    cleaned = version_str.strip()
    cleaned = re.sub(r"^thesis-", "", cleaned)  # Remove "thesis-" prefix
    cleaned = re.sub(r"\.md$", "", cleaned)      # Remove ".md" suffix
    
    # Try different patterns
    # Format: v1-2 or 1-2
    match = re.match(r"v?(\d+)-(\d+)", cleaned)
    if match:
        return int(match.group(1)), int(match.group(2))
    
    # Format: v1.2 or 1.2
    match = re.match(r"v?(\d+)\.(\d+)", cleaned)
    if match:
        return int(match.group(1)), int(match.group(2))
    
    raise ValueError(f"Invalid version format: {version_str}")


def remove_revision(version_str: str) -> None:
    """Remove a specific revision."""
    try:
        major, minor = parse_version_string(version_str)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    
    slug = f"thesis-v{major}-{minor}"
    file_path = RESEARCH_DIR / f"{slug}.md"
    
    if not file_path.exists():
        print(f"Error: Revision v{major}.{minor} not found.")
        sys.exit(1)
    
    revisions = get_revisions()
    target = next((r for r in revisions if r.major == major and r.minor == minor), None)
    
    if target and target.is_current:
        print(f"Warning: v{major}.{minor} is the current version!")
        response = input("Are you sure? [y/N]: ")
        if response.lower() != "y":
            print("Cancelled.")
            return
    
    print(f"Removing revision v{major}.{minor}...")
    
    file_path.unlink()
    print(f"  ✓ Deleted {file_path.name}")
    
    # Update index.md
    if INDEX_FILE.exists():
        content = INDEX_FILE.read_text(encoding="utf-8")
        content = re.sub(rf"\|.*?v{major}\.{minor}.*?\|\n", "", content)
        INDEX_FILE.write_text(content, encoding="utf-8")
        print(f"  ✓ Updated index.md")
    
    # Update astro.config.mjs
    if ASTRO_CONFIG.exists():
        content = ASTRO_CONFIG.read_text(encoding="utf-8")
        content = re.sub(rf".*?'修士論文 v{major}\.{minor}'.*?,\n", "", content)
        ASTRO_CONFIG.write_text(content, encoding="utf-8")
        print(f"  ✓ Updated astro.config.mjs")
    
    print(f"\n✅ Removed revision v{major}.{minor}")


# =============================================================================
# Main
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Thesis revision management tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s init              Initialize source directory structure
  %(prog)s split             Split existing thesis into source structure
  %(prog)s build             Build thesis from source (creates new revision)
  %(prog)s major             Increment major version (1.x → 2.0)
  %(prog)s tree              Show source directory structure
  %(prog)s list              List all revisions
  %(prog)s show 1.2          Show details of v1.2
  %(prog)s remove 1.0        Remove revision v1.0
        """,
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    subparsers.add_parser("init", help="Initialize source directory structure")
    subparsers.add_parser("split", help="Split existing thesis into source structure")
    subparsers.add_parser("build", help="Build thesis from source")
    subparsers.add_parser("major", help="Increment major version")
    subparsers.add_parser("tree", help="Show source directory structure")
    subparsers.add_parser("list", help="List all revisions")
    
    show_parser = subparsers.add_parser("show", help="Show revision details")
    show_parser.add_argument("version", help="Version (e.g., 1.1)")
    
    remove_parser = subparsers.add_parser("remove", help="Remove a revision")
    remove_parser.add_argument("version", help="Version (e.g., 1.0)")
    
    # Legacy command
    new_parser = subparsers.add_parser("new", help="(Legacy) Create new revision")
    new_parser.add_argument("revision", nargs="?", default="revision")
    
    args = parser.parse_args()
    
    if sys.version_info < (3, 8):
        print("Error: Python 3.8+ required.")
        sys.exit(1)
    
    config = load_config()
    
    if args.command == "init":
        init_source_structure(config)
    elif args.command == "split":
        split_existing_thesis(config)
    elif args.command == "build":
        build_thesis(config)
    elif args.command == "major":
        increment_major_version(config)
    elif args.command == "tree":
        show_source_tree(config)
    elif args.command == "list":
        list_revisions()
    elif args.command == "show":
        show_revision(args.version)
    elif args.command == "remove":
        remove_revision(args.version)
    elif args.command == "new":
        # Legacy: just run build
        build_thesis(config)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
