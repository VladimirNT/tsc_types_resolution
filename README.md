# Types resolution with compilerOptions.paths
Example project with minimal test-case for the type resolution issue in tsc


## Bug Report

In the projects having non-hoisted types we got tsc resolver for type reference directive working differently with or without `compilerOptions.paths` causing failure in resolution in case we have it set.
The example project is attached.

// Example project tree:
``` 
├── node_modules
│   ├── express -> ../.pnpm-v-store/express@4.18.2/node_modules/express
│   └── @types
│       ├── express -> ../../.pnpm-v-store/@types/express@4.17.17/node_modules/@types/express
│       └── node -> ../../.pnpm-v-store/@types/node@18.15.3/node_modules/@types/node
├── package.json
├── pnpm-lock.yaml
├── src
│   ├── a.ts
└── tsconfig.json
```

// tsconfig.json:
```
{
    "compilerOptions": {
        "allowJs": true,
        "target": "es6",
        "strict": true,
        "sourceMap": true,
        "skipLibCheck": true,
        "esModuleInterop": true,
        "moduleResolution": "node",
	"baseUrl": "node_modules",
        "paths": { "*": [ "*", "./@types/*" ] }
    },
    "include": [ "src/**/*" ]
}
```


Resolve logs are a bit different in general as with `paths` tsc starts to resolve symlinks, but this doesn't look as a root cause, because it is still able to see the directories in both cases, but the main issue is it just skips search for `{module}/package.json` in case we have `paths`:


// Resolve log for `express-serve-static-core` with `paths` set in tsconfig.json:
```
======== Resolving type reference directive 'express-serve-static-core', containing file '/tmp/tsc_test1/projA/node_modules/@types/express/index.d.ts', root directory '/tmp/tsc_test1/projA/node_modules/@types'. ========
Resolving with primary search path '/tmp/tsc_test1/projA/node_modules/@types'.
Looking up in 'node_modules' folder, initial location '/tmp/tsc_test1/projA/node_modules/@types/express'.
Directory '/tmp/tsc_test1/projA/node_modules/@types/express/node_modules' does not exist, skipping all lookups in it.
Directory '/tmp/tsc_test1/projA/node_modules/@types/node_modules' does not exist, skipping all lookups in it.
File '/tmp/tsc_test1/projA/node_modules/express-serve-static-core.d.ts' does not exist.
File '/tmp/tsc_test1/projA/node_modules/@types/express-serve-static-core.d.ts' does not exist.
Directory '/tmp/tsc_test1/node_modules' does not exist, skipping all lookups in it.
Directory '/tmp/node_modules' does not exist, skipping all lookups in it.
Directory '/node_modules' does not exist, skipping all lookups in it.
======== Type reference directive 'express-serve-static-core' was not resolved. ========
```


// Resolve log for `express-serve-static-core` without `paths` set in tsconfig.json:
```
======== Resolving type reference directive 'express-serve-static-core', containing file '/store_path_replaced/.pnpm-v-store/@types/express@4.17.17/node_modules/@types/express/index.d.ts', root directory '/tmp/tsc_test1/projA/node_modules/@types'. ========
Resolving with primary search path '/tmp/tsc_test1/projA/node_modules/@types'.
Looking up in 'node_modules' folder, initial location '/store_path_replaced/.pnpm-v-store/@types/express@4.17.17/node_modules/@types/express'.
Directory '/store_path_replaced/.pnpm-v-store/@types/express@4.17.17/node_modules/@types/express/node_modules' does not exist, skipping all lookups in it.
Directory '/store_path_replaced/.pnpm-v-store/@types/express@4.17.17/node_modules/@types/node_modules' does not exist, skipping all lookups in it.
File '/store_path_replaced/.pnpm-v-store/@types/express@4.17.17/node_modules/express-serve-static-core.d.ts' does not exist.
Found 'package.json' at '/store_path_replaced/.pnpm-v-store/@types/express@4.17.17/node_modules/@types/express-serve-static-core/package.json'.
'package.json' does not have a 'typesVersions' field.
File '/store_path_replaced/.pnpm-v-store/@types/express@4.17.17/node_modules/@types/express-serve-static-core.d.ts' does not exist.
'package.json' does not have a 'typings' field.
'package.json' has 'types' field 'index.d.ts' that references '/store_path_replaced/.pnpm-v-store/@types/express@4.17.17/node_modules/@types/express-serve-static-core/index.d.ts'.
File '/store_path_replaced/.pnpm-v-store/@types/express@4.17.17/node_modules/@types/express-serve-static-core/index.d.ts' exist - use it as a name resolution result.
Resolving real path for '/store_path_replaced/.pnpm-v-store/@types/express@4.17.17/node_modules/@types/express-serve-static-core/index.d.ts', result '/store_path_replaced/.pnpm-v-store/@types/express-serve-static-core@4.17.33/node_modules/@types/express-serve-static-core/index.d.ts'.
======== Type reference directive 'express-serve-static-core' was successfully resolved to '/store_path_replaced/.pnpm-v-store/@types/express-serve-static-core@4.17.33/node_modules/@types/express-serve-static-core/index.d.ts' with Package ID '@types/express-serve-static-core/index.d.ts@4.17.33', primary: false. ========
```

// Main diff:
```
/// with paths
- File '/tmp/tsc_test1/projA/node_modules/express-serve-static-core.d.ts' does not exist.
- File '/tmp/tsc_test1/projA/node_modules/@types/express-serve-static-core.d.ts' does not exist.
- Directory '/tmp/tsc_test1/node_modules' does not exist, skipping all lookups in it.
// then it just goes up until root 

/// without paths
+ File '/store_path_replaced/.pnpm-v-store/@types/express@4.17.17/node_modules/@types/express-serve-static-core.d.ts' does not exist.
+ Found 'package.json' at '/store_path_replaced/.pnpm-v-store/@types/express@4.17.17/node_modules/@types/express-serve-static-core/package.json'.
+ 'package.json' does not have a 'typesVersions' field.
+ File '/store_path_replaced/.pnpm-v-store/@types/express@4.17.17/node_modules/@types/express-serve-static-core.d.ts' does not exist.
+ 'package.json' does not have a 'typings' field.
+ 'package.json' has 'types' field 'index.d.ts' that references '/store_path_replaced/.pnpm-v-store/@types/express@4.17.17/node_modules/@types/express-serve-static-core/index.d.ts'.
// the main difference that it reads `package.json` and takes `types` ref from there
```


To have types out of `node_modules/@types/` I am using use `--public-hoist-pattern ""` for pnpm, this is important on trying to reproduce.

Test case:
1. Untar the attached test-case.tar to any tmp directory
2. Install dependencies with the exact command:
`pnpm i --frozen-lockfile --public-hoist-pattern ""`
3. Run `tsc`, it will fail to resolve type-referene directive 'express-serve-static-core'
4. To get tsc complete successfully remove `paths` from `tsconfig.json` and run `tsc` again.



### 🔎 Search Terms

tsc types with paths, type resolution paths, non-hoisted types and paths


### 🕗 Version & Regression Information

- This is the behavior in every version I tried, and I reviewed the FAQ for entries about it.

### ⏯ Playground Link

- The case need both tsconfig.json and specific dependencies, so I can't see a good way to implement it in the playground.

### 💻 Code

Test case:
1. Use the test case from this repository
2. Install dependencies with the exact command: `pnpm i --frozen-lockfile --public-hoist-pattern ""`
3. Run `tsc`, it will fail to resolve type-referene directive 'express-serve-static-core'
4. To get tsc complete successfully remove `paths` from `tsconfig.json` and run `tsc` again.

### 🙁 Actual behavior

When compilerOptions.paths is set we got no check for package.json in the referenced module so tsc couldn't resolve the type, in the same time with no `paths` set it could resolve it as package.json is checked and `types` field is taken into accound from there.

### 🙂 Expected behavior

In both scenarios `tsc` should resolve types in the same way keeping it consistent and reliable.
