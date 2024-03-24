chrome.runtime.onMessage.addListener(function(message, sender) {
    if (message.icon === 'active') {
      chrome.action.setIcon({path: 'icon_active.png', tabId: sender.tab.id});
    }
  });
  
  chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
      target: {tabId: tab.id},
      function: functionToShowAlert
    });
  });
  
  function functionToShowAlert() {
    alert("You are on the Staples Order Page!");
  }