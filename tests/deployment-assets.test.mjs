import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';

test('hosting excludes private backend files while including the public account library', t => {
  const root=mkdtempSync(join(tmpdir(),'tkdflow-hosting-rules-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const env={...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'};
  execFileSync('git',['-c','init.templateDir=','init','--quiet','--initial-branch=fixture'],{cwd:root,env});
  writeFileSync(join(root,'.gitignore'),readFileSync(new URL('../.vercelignore',import.meta.url)));
  const privatePaths=['supabase/functions/enroll/index.ts','supabase/school-directory.sql','supabase-setup.sql','tests/private.test.mjs'];
  const publicPaths=['vendor/supabase/supabase-2.119.0.js','vendor/supabase/LICENSE','vendor/supabase/source.json','vendor/three/three.module.js','js/lib/school-picker.js'];
  for(const path of [...privatePaths,...publicPaths]){mkdirSync(join(root,path.substring(0,path.lastIndexOf('/'))||'.'),{recursive:true});writeFileSync(join(root,path),'fixture');}
  const result=spawnSync('git',['-c','core.excludesFile=/dev/null','check-ignore','--no-index','--stdin'],{cwd:root,env,input:[...privatePaths,...publicPaths].join('\n')+'\n',encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.deepEqual(new Set(result.stdout.trim().split('\n')),new Set(privatePaths));
});
