import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const start = app.indexOf('/* YOUTUBE_MUSIC_FNS */');
const end = app.indexOf('/* /YOUTUBE_MUSIC_FNS */', start);
assert.ok(start >= 0 && end > start, 'YouTube Music helper block exists');
const helpers = new Function(app.slice(start + '/* YOUTUBE_MUSIC_FNS */'.length, end) +
  '\nreturn {youtubeMusicUrl, youtubeMusicRequest, YTM_MUSIC_TYPES};')();
const { youtubeMusicUrl, youtubeMusicRequest } = helpers;

test('normalize and allow legitimate YouTube Music playlist URLs', () => {
  const id = 'PLMtYkFCCurnwZJ2k7NOz1VCcBN8aGj8U';
  assert.equal(youtubeMusicUrl('https://music.youtube.com/playlist?list=' + id), 'https://music.youtube.com/playlist?list=' + id);
  assert.equal(youtubeMusicUrl('https://www.youtube.com/playlist?list=' + id + '&si=tracking'), 'https://music.youtube.com/playlist?list=' + id);
  assert.equal(youtubeMusicUrl('https://music.youtube.com/watch?v=abcdefghijk&list=' + id),
    'https://music.youtube.com/watch?v=abcdefghijk&list=' + id);
  assert.equal(youtubeMusicUrl('https://youtube.com/watch?v=abcdefghijk'),
    'https://music.youtube.com/watch?v=abcdefghijk');
});

test('reject links with unsupported origins, schemes or missing media IDs', () => {
  for (const value of [
    'javascript:alert(1)',
    'https://evil.example.com/playlist?list=PLMtYkFCCurnwZJ2k7NOz1VCcBN8aGj8U',
    'http://music.youtube.com/playlist?list=PLMtYkFCCurnwZJ2k7NOz1VCcBN8aGj8U',
    'https://music.youtube.com/playlist?list=',
    'https://music.youtube.com/channel/any_id',
    'https://music.youtube.com/playlist?list=<script>',
    null,
    '',
  ]) assert.equal(youtubeMusicUrl(value), '', String(value));
});

test('send named tracks, albums, artists and playlists with Music Assistant payloads', () => {
  assert.deepEqual(youtubeMusicRequest(' Queen - Bohemian Rhapsody ', 'track'),
    {media_id: 'Queen - Bohemian Rhapsody', media_type: 'track', enqueue: 'play'});
  assert.deepEqual(youtubeMusicRequest('Evening Chill', 'playlist'),
    {media_id: 'Evening Chill', media_type: 'playlist', enqueue: 'play'});
  assert.deepEqual(youtubeMusicRequest('The Beatles', 'artist'),
    {media_id: 'The Beatles', media_type: 'artist', enqueue: 'play'});
  assert.deepEqual(youtubeMusicRequest('Abbey Road', 'album'),
    {media_id: 'Abbey Road', media_type: 'album', enqueue: 'play'});
  const playlist = 'https://music.youtube.com/playlist?list=PLMtYkFCCurnwZJ2k7NOz1VCcBN8aGj8U';
  assert.deepEqual(youtubeMusicRequest(playlist, 'track'),
    {media_id: playlist, media_type: 'playlist', enqueue: 'play'});
});

test('reject invalid requests rather than calling service', () => {
  assert.equal(youtubeMusicRequest('track', 'radio'), null);
  assert.equal(youtubeMusicRequest('', 'track'), null);
  assert.equal(youtubeMusicRequest('bad<script>', 'track'), null);
  assert.equal(youtubeMusicRequest('https://not-youtube.com/watch?v=abcdeabcde1', 'track'), null);
  assert.equal(youtubeMusicRequest('A'.repeat(301), 'track'), null);
});

test('UI guards playback without HA and preserves existing speaker controls', () => {
  assert.match(app, /async function youtubeMusicPlay/);
  assert.match(app, /if \(!player\) \{/);
  assert.match(app, /call\('music_assistant', 'play_media', player, request\)/);
  assert.match(app, /if \(YTM\.busy\) return false/);
  assert.match(app, /function youtubeMusicPanel\(/);
  assert.match(app, /function appMusic\(\)/);
  assert.match(app, /data-act="ytm-play"/);
  assert.match(app, /data-act="ytm-add"/);
  assert.match(app, /data-act="ytm-remove"/);
  assert.match(app, /data-act="media"/);
  assert.match(app, /ytm-play-saved/);
  assert.doesNotMatch(app, /ytmusicapi|__Secure-3PAPISID|youtube\.com\/api\/browse/);
});
