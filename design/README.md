# Design sources

`og-image.html` renders `static/og-image.png` (1200x630 link preview):

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --window-size=1200,630 --screenshot=static/og-image.png "file://$PWD/design/og-image.html"
```
