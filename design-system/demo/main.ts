import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource/jetbrains-mono';
import '../tokens/tokens.css';
import { mount } from 'svelte';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
