import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const channelId = 'kedy_general_notifications';
const iconName = 'ic_stat_kedy_notification';

const manifestPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const stringsPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
const drawablePath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'drawable', `${iconName}.xml`);

const iconMetaData = [
  '        <meta-data',
  '            android:name="com.google.firebase.messaging.default_notification_icon"',
  `            android:resource="@drawable/${iconName}" />`,
  '        <meta-data',
  '            android:name="com.google.firebase.messaging.default_notification_channel_id"',
  '            android:value="@string/default_notification_channel_id" />',
].join('\n');

const drawableXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M12,22c1.1,0 2,-0.9 2,-2h-4c0,1.1 0.9,2 2,2zM18,16v-5c0,-3.07 -1.63,-5.64 -4.5,-6.32V4c0,-0.83 -0.67,-1.5 -1.5,-1.5S10.5,3.17 10.5,4v0.68C7.64,5.36 6,7.92 6,11v5l-2,2v1h16v-1l-2,-2z" />
</vector>
`;

async function readIfExists(targetPath) {
  try {
    return await fs.readFile(targetPath, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function ensureManifest() {
  const content = await readIfExists(manifestPath);
  if (!content) {
    console.warn('AndroidManifest.xml not found, skipping push asset patch.');
    return;
  }

  if (content.includes('com.google.firebase.messaging.default_notification_icon')) {
    return;
  }

  const updated = content.replace(
    /<application\b([\s\S]*?)>/,
    (match) => `${match}\n\n${iconMetaData}\n`,
  );

  await fs.writeFile(manifestPath, updated, 'utf8');
}

async function ensureStrings() {
  const content = await readIfExists(stringsPath);
  if (!content) {
    console.warn('Android strings.xml not found, skipping push channel patch.');
    return;
  }

  if (content.includes('default_notification_channel_id')) {
    return;
  }

  const updated = content.replace(
    '</resources>',
    `    <string name="default_notification_channel_id">${channelId}</string>\n</resources>`,
  );

  await fs.writeFile(stringsPath, updated, 'utf8');
}

async function ensureDrawable() {
  await fs.mkdir(path.dirname(drawablePath), { recursive: true });
  await fs.writeFile(drawablePath, drawableXml, 'utf8');
}

async function main() {
  await ensureManifest();
  await ensureStrings();
  await ensureDrawable();
  console.log('Android push assets ensured.');
}

main().catch((error) => {
  console.error('Failed to ensure Android push assets:', error);
  process.exitCode = 1;
});
