import cp from 'child_process';
import path from 'path';
import fs from 'fs';
import gulp from 'gulp';
import os from 'os';
import url from 'url';

const rootDirPath = path.dirname(url.fileURLToPath(import.meta.url));

/**
 * @param {string} cmd
 * @param {string?} cwd
 */
function _run(cmd, cwd) {
  console.log('ℹ️  ' + cmd);
  cp.execSync(cmd, { stdio: 'inherit', cwd: cwd ?? rootDirPath });
}

//~~~

gulp.task('default', cb => {
  console.log('✅ Available tasks:');
  cp.execSync('gulp -T', { stdio: 'inherit' });
  cb();
});

gulp.task('build', cb => {
  _run('yarn run prettier:write');
  _run('yarn run embedme:write');
  _run('yarn run prettier:check');
  _run('yarn run embedme:check');
  cb();
});

gulp.task('pub', cb => {
  _run('yarn run dev-to-git');
  cb();
});
