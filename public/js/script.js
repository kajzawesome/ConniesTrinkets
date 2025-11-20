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

// Highlight active category link on home page
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const activeCategory = params.get("category");
  
  if (activeCategory) {
    const categoryLinks = document.querySelectorAll(".category-card");
    categoryLinks.forEach(link => {
      const href = link.getAttribute("href");
      if (href.includes(activeCategory.toLowerCase())) {
        link.classList.add("active-category");
      }
    });
  }
});

// Claim item via AJAX
document.addEventListener("DOMContentLoaded", () => {
  const claimForms = document.querySelectorAll(".item-card form");
  
  claimForms.forEach(form => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const action = form.getAttribute("action");

      try {
        const res = await fetch(action, { method: "POST", credentials: 'same-origin' });
        if (res.ok) {
          const card = form.closest(".item-card");
          card.classList.add("claimed-item");
          card.querySelector(".claimed-status").innerHTML = `<span class="claimed">Claimed by You</span>`;
        } else {
          alert("Error claiming item.");
        }
      } catch (err) {
        console.error(err);
        alert("Error claiming item.");
      }
    });
  });
});

// Auto-submit filters on typing (debounced) and on checkbox change
document.addEventListener("DOMContentLoaded", () => {
  const filterForm = document.querySelector('.market-filters');
  if (!filterForm) return;

  const qInput = filterForm.querySelector('input[name="q"]');
  const checkboxes = filterForm.querySelectorAll('input[type="checkbox"][name="categories"]');

  // debounce helper
  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  const submitForm = () => filterForm.submit();

  if (qInput) {
    qInput.addEventListener('input', debounce(() => {
      submitForm();
    }, 350));
  }

  if (checkboxes && checkboxes.length) {
    checkboxes.forEach(cb => cb.addEventListener('change', () => submitForm()));
  }
});
