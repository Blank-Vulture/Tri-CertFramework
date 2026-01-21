import { defineCollection, z } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';

// メールデータのスキーマ定義
const emailsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    // メールのメタデータ
    timestamp: z.string(), // "2026-01-20T10:01:00+09:00"
    from: z.string(),
    to: z.string(),
    subject: z.string().optional(),
    // 分類用
    sessionId: z.string(), // "REV-001"
    type: z.enum(['received', 'sent', 'internal']),
    // 表示用
    summary: z.string(), // 1行要約
    interpretation: z.string().optional(), // 解釈・決定事項
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  docs: defineCollection({ schema: docsSchema() }),
  emails: emailsCollection,
};
