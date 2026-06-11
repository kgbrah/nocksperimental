// Empty stub aliased in for optional dependencies that wagmi/WalletConnect lazy-import (e.g. the
// "accounts" dep of wagmi's Tempo connector, which we never use). The real `import()` is wrapped in a
// runtime `.catch`, so the alias only satisfies build-time static resolution; the module is never
// actually invoked in our flows (injected + WalletConnect via Reown AppKit).
export default {};
