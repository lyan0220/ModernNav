
import React from 'react';
import { Category, SearchEngine } from './types';
import { Globe, Github, Search, Code, Layout, Video, Coffee, ShoppingBag, Terminal, Server, Cloud, Mail } from 'lucide-react';

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'home',
    title: 'Home',
    subCategories: [
      {
        id: 'social',
        title: 'Social & Mail',
        items: [
          { id: '1', title: 'YouTube', url: 'https://youtube.com', icon: 'Video' },
          { id: '5', title: 'Gmail', url: 'https://mail.google.com', icon: 'Mail' },
        ]
      },
      {
        id: 'dev-tools',
        title: 'Tools',
        items: [
          { id: '2', title: 'GitHub', url: 'https://github.com', icon: 'Github' },
          { id: '3', title: 'ChatGPT', url: 'https://chat.openai.com', icon: 'Terminal' },
          { id: '4', title: 'Cloudflare', url: 'https://cloudflare.com', icon: 'Cloud' },
        ]
      }
    ]
  },
  {
    id: 'ai',
    title: 'AI Stuff',
    subCategories: [
      {
        id: 'generators',
        title: 'Generators',
        items: [
          { id: '11', title: 'HuggingFace', url: 'https://huggingface.co', icon: 'Smile' },
          { id: '12', title: 'Midjourney', url: 'https://midjourney.com', icon: 'Image' },
        ]
      }
    ]
  },
  {
    id: 'dev',
    title: 'Development',
    subCategories: [
      {
        id: 'docs',
        title: 'Documentation',
        items: [
          { id: '31', title: 'Stack Overflow', url: 'https://stackoverflow.com', icon: 'Code' },
          { id: '32', title: 'MDN', url: 'https://developer.mozilla.org', icon: 'Globe' },
        ]
      },
      {
        id: 'cloud-services',
        title: 'Cloud Providers',
        items: [
          { id: '21', title: 'AWS', url: 'https://aws.amazon.com', icon: 'Server' },
          { id: '22', title: 'DigitalOcean', url: 'https://digitalocean.com', icon: 'Cloud' },
        ]
      }
    ]
  }
];

// Using high-quality favicons for search engines
// Using favicon.im with larger=true for best quality
export const SEARCH_ENGINES: SearchEngine[] = [
  { 
    id: 'google', 
    name: 'Google', 
    urlTemplate: 'https://www.google.com/search?q=', 
    icon: <img src="https://favicon.im/google.com?larger=true" alt="Google" className="w-full h-full object-contain" /> 
  },
  { 
    id: 'baidu', 
    name: 'Baidu', 
    urlTemplate: 'https://www.baidu.com/s?wd=', 
    icon: <img src="https://favicon.im/baidu.com?larger=true" alt="Baidu" className="w-full h-full object-contain" /> 
  },
  { 
    id: 'bing', 
    name: 'Bing', 
    urlTemplate: 'https://www.bing.com/search?q=', 
    icon: <img src="https://favicon.im/bing.com?larger=true" alt="Bing" className="w-full h-full object-contain" /> 
  },
  { 
    id: 'github', 
    name: 'GitHub', 
    urlTemplate: 'https://github.com/search?q=', 
    icon: <img src="https://favicon.im/github.com?larger=true" alt="GitHub" className="w-full h-full object-contain bg-white rounded-full p-[1px]" /> 
  },
];
