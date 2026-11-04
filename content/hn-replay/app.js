// Refresh pages that still have the previous HTML cached.
const url = new URL(location.href);
if (url.searchParams.get("library") !== "3") {
  url.searchParams.set("library", "3");
  location.replace(url);
} else {
  const status = document.querySelector("#result-count");
  if (status) status.textContent = "网页已更新，请重新载入。";
}
