// Fuentes y tokens del sistema de diseño: se importan una sola vez aquí.
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource/jetbrains-mono';
import 'design-system/tokens.css';
import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('No se encontró el elemento #app');

export default mount(App, { target });
