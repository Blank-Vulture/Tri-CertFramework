#!/usr/bin/env python3
"""
extract_docx_comments.py - docxファイルからコメントを抽出するツール

Usage:
    python extract_docx_comments.py <docx_path> [--json] [--markdown]
"""

import json
import re
import sys
import zipfile
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree as ET

# Word XMLの名前空間
NAMESPACES = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}


def extract_text_from_element(element):
    """XML要素からテキストを再帰的に抽出"""
    texts = []
    for child in element.iter():
        if child.tag == f"{{{NAMESPACES['w']}}}t" and child.text:
            texts.append(child.text)
        elif child.tag == f"{{{NAMESPACES['w']}}}hyperlink":
            # ハイパーリンク内のテキストも取得
            for t in child.iter(f"{{{NAMESPACES['w']}}}t"):
                if t.text:
                    texts.append(t.text)
    return ''.join(texts)


def extract_comments(docx_path):
    """docxファイルからコメントを抽出"""
    comments = []

    with zipfile.ZipFile(docx_path, 'r') as zf:
        # comments.xmlを読み込み
        try:
            comments_xml = zf.read('word/comments.xml')
        except KeyError:
            print("コメントが見つかりません", file=sys.stderr)
            return []

        root = ET.fromstring(comments_xml)

        # 各コメントを処理
        for comment in root.findall('.//w:comment', NAMESPACES):
            comment_id = comment.get(f"{{{NAMESPACES['w']}}}id")
            author = comment.get(f"{{{NAMESPACES['w']}}}author")
            date_str = comment.get(f"{{{NAMESPACES['w']}}}date")

            # 日時をパース
            if date_str:
                try:
                    dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    # JSTに変換
                    from datetime import timedelta, timezone
                    jst = timezone(timedelta(hours=9))
                    dt_jst = dt.astimezone(jst)
                    date_formatted = dt_jst.strftime('%Y-%m-%d %H:%M')
                except (ValueError, TypeError):
                    date_formatted = date_str
            else:
                date_formatted = ""

            # コメント本文を抽出（段落ごとに改行）
            paragraphs = []
            for para in comment.findall('.//w:p', NAMESPACES):
                para_text = extract_text_from_element(para)
                if para_text.strip():
                    paragraphs.append(para_text.strip())

            text = '\n'.join(paragraphs)

            if text:  # 空でないコメントのみ追加
                comments.append({
                    'id': comment_id,
                    'author': author,
                    'date': date_formatted,
                    'text': text,
                })

    # 日時でソート
    comments.sort(key=lambda x: x['date'])
    return comments


def format_as_markdown_table(comments):
    """コメントをMarkdownテーブル形式で出力"""
    lines = [
        "| # | 日時 | コメント内容 | 対応状況 |",
        "|---|------|-------------|----------|",
    ]

    for i, c in enumerate(comments, 1):
        # 改行を<br>に置換、パイプをエスケープ
        text = c['text'].replace('\n', '<br>').replace('|', '\\|')
        lines.append(f"| {i} | {c['date']} | {text} | |")

    return '\n'.join(lines)


def format_as_markdown_list(comments):
    """コメントをMarkdownリスト形式で出力"""
    lines = []
    for i, c in enumerate(comments, 1):
        lines.append(f"### コメント {i} ({c['date']})")
        lines.append("")
        lines.append(c['text'])
        lines.append("")

    return '\n'.join(lines)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    docx_path = Path(sys.argv[1])
    if not docx_path.exists():
        print(f"ファイルが見つかりません: {docx_path}", file=sys.stderr)
        return 1

    output_format = "table"  # デフォルト
    if "--json" in sys.argv:
        output_format = "json"
    elif "--list" in sys.argv:
        output_format = "list"

    comments = extract_comments(docx_path)

    if output_format == "json":
        print(json.dumps(comments, ensure_ascii=False, indent=2))
    elif output_format == "list":
        print(format_as_markdown_list(comments))
    else:
        print(format_as_markdown_table(comments))


if __name__ == "__main__":
    main()
