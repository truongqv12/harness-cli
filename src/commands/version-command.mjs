import { readPackageInfo } from '../core/package-info.mjs';

export function runVersion(_args, context) {
  const pkg = readPackageInfo(context.packageRoot);
  console.log(`${pkg.name} ${pkg.version}`);
}
