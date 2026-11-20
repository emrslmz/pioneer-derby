<template>
  <footer class="footer" data-testid="app-footer">
    Created by
    <a
      class="footer__link"
      href="https://emresolmaz.com.tr"
      target="_blank"
      rel="noopener noreferrer"
      data-testid="footer-link"
      >emresolmaz.com.tr</a
    >
  </footer>
</template>

<style scoped lang="scss">
.footer {
  // A signature, not interface text: the same in every language, set in a serif.
  height: var(--footer-height);
  font-family: 'Times New Roman', Times, serif;
  line-height: var(--footer-height);
  text-align: center;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  letter-spacing: 0.03em;

  // On a phone the fixed tab bar sits at the bottom of the screen: keep the footer above it.
  @media (max-width: 767px) {
    margin-bottom: calc(var(--tabbar-height) + env(safe-area-inset-bottom));
  }
}

.footer__link {
  color: var(--color-text);
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: var(--color-accent);
  text-underline-offset: 3px;

  &:hover {
    color: var(--color-accent-strong);
  }
}
</style>
