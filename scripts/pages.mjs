import { cp, mkdir, rename, rm } from 'node:fs/promises';

await rename('dist/src/page.html', 'dist/index.html');
await rm('dist/src', {recursive: true, force: true});
await mkdir('dist/forge-media', {recursive: true});
const media = ['1x1.gif', 'delete-icon.svg', 'dropdown-arrow.svg', 'foldout-icon.svg', 'handclosed.cur', 'handdelete.cur', 'handopen.cur', 'pilcrow.png', 'quote0.png', 'quote1.png', 'resize-handle.svg', 'sprites.png', 'sprites.svg'];
await Promise.all(media.map(name => cp('node_modules/blockly/media/' + name, 'dist/forge-media/' + name)));

if (process.argv.includes('--publish-root')) {
  for (const path of ['forge-assets', 'forge-media', 'index.html']) {
    await rm(path, {recursive: true, force: true});
    await cp('dist/' + path, path, {recursive: path !== 'index.html'});
  }
}
