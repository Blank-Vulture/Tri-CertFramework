import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://your-username.github.io',
  base: '/Tri-CertFramework',
  integrations: [
    starlight({
      expressiveCode: {
        // Exclude mermaid from code highlighting so it can be rendered client-side
        themes: ['github-dark', 'github-light'],
      },
      title: 'Tri-CertFramework',
      description: 'ZK証明ベースのデジタル証明書検証システム',
      defaultLocale: 'root',
      locales: {
        root: {
          label: '日本語',
          lang: 'ja',
        },
        en: {
          label: 'English',
          lang: 'en',
        },
      },
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
        replacesTitle: false,
      },
      social: {
        github: 'https://github.com/Blank-Vulture/Blank-Vulture/Tri-CertFramework',
      },
      sidebar: [
        {
          label: 'はじめに',
          translations: { en: 'Getting Started' },
          items: [
            { label: '概要', slug: 'getting-started/overview', translations: { en: 'Overview' } },
            { label: 'テストガイド', slug: 'getting-started/test-guide', translations: { en: 'Test Guide' } },
          ],
        },
        {
          label: 'コンポーネント',
          translations: { en: 'Components' },
          items: [
            { label: 'Executive Console', slug: 'components/executive-console' },
            { label: 'Registrar Console', slug: 'components/registrar-console' },
            { label: 'Prover', slug: 'components/prover' },
            { label: 'Verifier UI', slug: 'components/verifier-ui' },
          ],
        },
        {
          label: 'リファレンス',
          translations: { en: 'Reference' },
          items: [
            { label: 'Registrations', slug: 'reference/registrations' },
            { label: 'セキュリティ', slug: 'reference/security', translations: { en: 'Security' } },
          ],
        },
        {
          label: '研究論文改訂歴',
          translations: { en: 'Revision History' },
          items: [
            { label: '改訂歴一覧', slug: 'revision-history', translations: { en: 'Revision History' } },
            { label: '2025-01-21 平石先生', slug: 'revision-history/2025-01-21-hiraishi-feedback', translations: { en: '2025-01-21 Hiraishi' } },
          ],
        },
        {
          label: '研究論文',
          translations: { en: 'Research' },
          items: [
            { label: '論文一覧', slug: 'research', translations: { en: 'Papers' } },
            { label: '修士論文 v2.46', slug: 'research/thesis-v2-46', translations: { en: 'Thesis v2.46' } },
            { label: '修士論文 v2.45', slug: 'research/thesis-v2-45', translations: { en: 'Thesis v2.45' } },
            { label: '修士論文 v2.44', slug: 'research/thesis-v2-44', translations: { en: 'Thesis v2.44' } },
            { label: '修士論文 v2.43', slug: 'research/thesis-v2-43', translations: { en: 'Thesis v2.43' } },
            { label: '修士論文 v2.42', slug: 'research/thesis-v2-42', translations: { en: 'Thesis v2.42' } },
            { label: '修士論文 v2.41', slug: 'research/thesis-v2-41', translations: { en: 'Thesis v2.41' } },
            { label: '修士論文 v2.40', slug: 'research/thesis-v2-40', translations: { en: 'Thesis v2.40' } },
            { label: '修士論文 v2.39', slug: 'research/thesis-v2-39', translations: { en: 'Thesis v2.39' } },
            { label: '修士論文 v2.38', slug: 'research/thesis-v2-38', translations: { en: 'Thesis v2.38' } },
            { label: '修士論文 v2.37', slug: 'research/thesis-v2-37', translations: { en: 'Thesis v2.37' } },
            { label: '修士論文 v2.36', slug: 'research/thesis-v2-36', translations: { en: 'Thesis v2.36' } },
            { label: '修士論文 v2.35', slug: 'research/thesis-v2-35', translations: { en: 'Thesis v2.35' } },
            { label: '修士論文 v2.34', slug: 'research/thesis-v2-34', translations: { en: 'Thesis v2.34' } },
            { label: '修士論文 v2.33', slug: 'research/thesis-v2-33', translations: { en: 'Thesis v2.33' } },
            { label: '修士論文 v2.32', slug: 'research/thesis-v2-32', translations: { en: 'Thesis v2.32' } },
            { label: '修士論文 v2.31', slug: 'research/thesis-v2-31', translations: { en: 'Thesis v2.31' } },
            { label: '修士論文 v2.30', slug: 'research/thesis-v2-30', translations: { en: 'Thesis v2.30' } },
            { label: '修士論文 v2.29', slug: 'research/thesis-v2-29', translations: { en: 'Thesis v2.29' } },
            { label: '修士論文 v2.28', slug: 'research/thesis-v2-28', translations: { en: 'Thesis v2.28' } },
            { label: '修士論文 v2.27', slug: 'research/thesis-v2-27', translations: { en: 'Thesis v2.27' } },
            { label: '修士論文 v2.26', slug: 'research/thesis-v2-26', translations: { en: 'Thesis v2.26' } },
            { label: '修士論文 v1.25', slug: 'research/thesis-v1-25', translations: { en: 'Thesis v1.25' } },
            { label: '修士論文 v1.24', slug: 'research/thesis-v1-24', translations: { en: 'Thesis v1.24' } },
            { label: '修士論文 v1.23', slug: 'research/thesis-v1-23', translations: { en: 'Thesis v1.23' } },
            { label: '修士論文 v1.22', slug: 'research/thesis-v1-22', translations: { en: 'Thesis v1.22' } },
            { label: '修士論文 v1.21', slug: 'research/thesis-v1-21', translations: { en: 'Thesis v1.21' } },
            { label: '修士論文 v1.20', slug: 'research/thesis-v1-20', translations: { en: 'Thesis v1.20' } },
            { label: '修士論文 v1.19', slug: 'research/thesis-v1-19', translations: { en: 'Thesis v1.19' } },
            { label: '修士論文 v1.18', slug: 'research/thesis-v1-18', translations: { en: 'Thesis v1.18' } },
            { label: '修士論文 v1.17', slug: 'research/thesis-v1-17', translations: { en: 'Thesis v1.17' } },
            { label: '修士論文 v1.16', slug: 'research/thesis-v1-16', translations: { en: 'Thesis v1.16' } },
            { label: '修士論文 v1.15', slug: 'research/thesis-v1-15', translations: { en: 'Thesis v1.15' } },
            { label: '修士論文 v1.14', slug: 'research/thesis-v1-14', translations: { en: 'Thesis v1.14' } },
            { label: '修士論文 v1.13', slug: 'research/thesis-v1-13', translations: { en: 'Thesis v1.13' } },
            { label: '修士論文 v1.12', slug: 'research/thesis-v1-12', translations: { en: 'Thesis v1.12' } },
            { label: '修士論文 v1.11', slug: 'research/thesis-v1-11', translations: { en: 'Thesis v1.11' } },
            { label: '修士論文 v1.10', slug: 'research/thesis-v1-10', translations: { en: 'Thesis v1.10' } },
            { label: '修士論文 v1.9', slug: 'research/thesis-v1-9', translations: { en: 'Thesis v1.9' } },
            { label: '修士論文 v1.8', slug: 'research/thesis-v1-8', translations: { en: 'Thesis v1.8' } },
            { label: '修士論文 v1.7', slug: 'research/thesis-v1-7', translations: { en: 'Thesis v1.7' } },
            { label: '修士論文 v1.6', slug: 'research/thesis-v1-6', translations: { en: 'Thesis v1.6' } },
            { label: '修士論文 v1.5', slug: 'research/thesis-v1-5', translations: { en: 'Thesis v1.5' } },
            { label: '修士論文 v1.4', slug: 'research/thesis-v1-4', translations: { en: 'Thesis v1.4' } },
            { label: '修士論文 v1.3', slug: 'research/thesis-v1-3', translations: { en: 'Thesis v1.3' } },
            { label: '修士論文 v1.2', slug: 'research/thesis-v1-2', translations: { en: 'Thesis v1.2' } },
            { label: '修士論文 v1.1', slug: 'research/thesis-v1-1', translations: { en: 'Thesis v1.1' } },
            { label: '修士論文 v1.0', slug: 'research/thesis-v1-0', translations: { en: 'Thesis v1.0' } },
          ],
        },
        {
          label: 'アプリケーション',
          translations: { en: 'Applications' },
          items: [
            { label: 'Prover App', link: '/prover/', attrs: { target: '_blank' } },
            { label: 'Verifier App', link: '/verifier-ui/', attrs: { target: '_blank' } },
          ],
        },
      ],
      customCss: ['./src/styles/custom.css'],
      head: [
        {
          tag: 'meta',
          attrs: {
            name: 'theme-color',
            content: '#667eea',
          },
        },
        {
          tag: 'script',
          attrs: {
            type: 'module',
          },
          content: `
            import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
            mermaid.initialize({ 
              startOnLoad: true,
              theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'default'
            });
            // Re-initialize on theme change
            const observer = new MutationObserver(() => {
              mermaid.initialize({ 
                theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'default'
              });
              mermaid.run();
            });
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
          `,
        },
      ],
    }),
  ],
});
