const base = (d: string, extra = '') =>
  `<svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" ${extra}>${d}</svg>`;

export const icons = {
  menu: base('<path d="M4 7h16M4 12h16M4 17h10"/>'),
  search: base('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
  back: base('<path d="M15 5l-7 7 7 7"/>'),
  share: base('<circle cx="6" cy="12" r="2.2"/><circle cx="17.5" cy="6" r="2.2"/><circle cx="17.5" cy="18" r="2.2"/><path d="M8 11l7.5-4M8 13l7.5 4"/>'),
  front: base('<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>'),
  dispatch: base('<path d="M4 6.5l5-2 6 2 5-2v13l-5 2-6-2-5 2z"/><path d="M9 4.5v13M15 6.5v13"/>'),
  archive: base('<path d="M7 3.5h10a1 1 0 011 1V20l-6-3.5L6 20V4.5a1 1 0 011-1z"/>'),
  about: base('<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>'),
  plus: base('<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>'),
  scale: base('<path d="M12 4v16M7 20h10M5 8h14"/><path d="M5 8l-2.5 6a3 3 0 005 0zM19 8l-2.5 6a3 3 0 005 0z"/>'),
  coin: base('<circle cx="12" cy="12" r="8"/><path d="M12 7.5v9M9.5 10c0-1 1-1.6 2.5-1.6s2.5.6 2.5 1.6-1 1.4-2.5 1.7-2.5.7-2.5 1.700 1 1.600 2.500 1.600 2.500-.6 2.500-1.600"/>'),
  link: base('<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>'),
  pen: base('<path d="M4 20l1-4L16.5 4.5a2 2 0 013 3L8 19z"/>'),
  close: base('<path d="M6 6l12 12M18 6L6 18"/>'),
  speaker: base('<path d="M4 9.500h3.500L12 5.500v13l-4.500-4H4z"/><path d="M15.500 9a4 4 0 010 6M18 6.500a7.500 7.500 0 010 11"/>'),
  muted: base('<path d="M4 9.500h3.500L12 5.500v13l-4.500-4H4z"/><path d="M16 9.500l5 5M21 9.500l-5 5"/>'),
  receipt: base('<path d="M6 3.5h12V20l-2.4-1.6L13.200 20 12 19l-1.200 1-2.400-1.600L6 20z"/><path d="M9 8.500h6M9 12h6"/>'),
  check: base('<path d="M5 12.500l4.500 4.500L19 7.500"/>'),
  flag: base('<path d="M6 21V4M6 5h11l-2 3.500 2 3.500H6"/>'),
  clock: base('<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>'),
  retry: base('<path d="M4.500 12a7.500 7.500 0 0112.800-5.300L20 9.500M20 4.500v5h-5M19.500 12a7.500 7.500 0 01-12.800 5.300L4 14.500M4 19.500v-5h5"/>'),
  arrow: base('<path d="M5 12h14M13 6l6 6-6 6"/>'),
};
export type IconName = keyof typeof icons;
