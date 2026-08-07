/** Remembers the last primary tab so detail screens can highlight the right one. */
let lastTab = 'index';

export function setLastTab(name: string) {
  lastTab = name;
}

export function getLastTab() {
  return lastTab;
}
