package br.igrejabatistafonte.apoio;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    hideWebViewScrollbars();
  }

  @Override
  public void onStart() {
    super.onStart();
    hideWebViewScrollbars();
  }

  private void hideWebViewScrollbars() {
    if (getBridge() == null) return;
    WebView webView = getBridge().getWebView();
    if (webView == null) return;
    webView.setVerticalScrollBarEnabled(false);
    webView.setHorizontalScrollBarEnabled(false);
    webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
  }
}
