import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { persistSettings } from './lib/state.svelte';

persistSettings();

export default mount(App, { target: document.getElementById('app')! });
