// For later enhancements (like AJAX claim updates, filters, etc.)      
console.log("Grandma’s Legacy script loaded.");

document.addEventListener("DOMContentLoaded", () => {
  const categoryLinks = document.querySelectorAll(".category-card");

  categoryLinks.forEach(link => {
    link.addEventListener("click", event => {
      if (!loggedIn) {
        event.preventDefault(); // Stop normal navigation
        window.location.href = "/login";
      }
    });
  });
});
