import { render } from 'solid-js/web';
import App from './App';

const rootElement = document.getElementById('app');

if (!rootElement) {
  throw new Error('Root element #app が見つかりませんでした');
}

render(() => <App />, rootElement);
