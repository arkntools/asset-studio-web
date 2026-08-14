import './setup/serviceWorker';
import './setup/vxeTableStyle';
import './setup/vxeTable';
import './main.scss';
import { createPinia } from 'pinia';
import App from './App.vue';

const app = createApp(App);

app.use(createPinia());

app.mount('#app');
