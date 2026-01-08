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
          label: '研究論文',
          translations: { en: 'Research' },
          items: [
            { label: '論文一覧', slug: 'research', translations: { en: 'Papers' } },
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
