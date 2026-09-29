document.getElementById("importBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  chrome.tabs.sendMessage(tab.id, {
    action: "IMPORT_GRADES",
  });

  window.close();
});