const $ = (selector) => document.querySelector(selector);
const bgMusic = document.getElementById("bgMusic");
const musicToggle = document.getElementById("musicToggle");

if (bgMusic && musicToggle) {
  bgMusic.volume = 0.25;

  musicToggle.addEventListener("click", async () => {
    if (bgMusic.paused) {
      try {
        await bgMusic.play();
        musicToggle.textContent = "Music: On";
        musicToggle.classList.add("active");
      } catch (error) {
        console.log("Music play blocked:", error);
      }
    } else {
      bgMusic.pause();
      musicToggle.textContent = "Music: Off";
      musicToggle.classList.remove("active");
    }
  });
}

function safeText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function cardLink(item) {
  const url = safeText(item.url, "#");
  const target = url.startsWith("http") ? " target=\"_blank\" rel=\"noopener noreferrer\"" : "";
  return `
    <a class="link-card" href="${url}"${target}>
      <strong>${safeText(item.label, "Link")}</strong>
      <span>${safeText(item.note, "Open link")}</span>
    </a>
  `;
}

function infoCard(item) {
  return `
    <div class="info-card">
      <span>${safeText(item.name, "Name")}</span>
      <strong>${safeText(item.value, "Add value")}</strong>
    </div>
  `;
}

function projectCard(item) {
  const url = safeText(item.url, "#");
  const target = url.startsWith("http") ? " target=\"_blank\" rel=\"noopener noreferrer\"" : "";
  return `
    <a class="project-card" href="${url}"${target}>
      <strong>${safeText(item.title, "Project")}</strong>
      <p>${safeText(item.description, "Project description")}</p>
    </a>
  `;
}

function statCard(item) {
  return `
    <div class="stat">
      <strong>${safeText(item.value, "-")}</strong>
      <span>${safeText(item.label, "stat")}</span>
    </div>
  `;
}

async function loadSite() {
  try {
    const res = await fetch("/api/site");
    const data = await res.json();

    const profile = data.profile || {};
    document.title = safeText(profile.name, "VEXL");

    $("#profileName").textContent = safeText(profile.name, "VEXL");
    $("#profileBio").textContent = safeText(profile.bio, "Dark red profile style.");
    $("#statusText").textContent = safeText(profile.status, "Building");

    if (profile.avatar) $("#profileAvatar").src = profile.avatar;
    if (profile.logo) $("#profileLogo").src = profile.logo;

    $("#stats").innerHTML = (data.stats || []).map(statCard).join("");
    $("#socialGrid").innerHTML = (data.socials || []).map(cardLink).join("");
    $("#specGrid").innerHTML = (data.specs || []).map(infoCard).join("");
    $("#cs2Grid").innerHTML = (data.cs2 || []).map(infoCard).join("");
    $("#projectGrid").innerHTML = (data.projects || []).map(projectCard).join("");
  } catch (error) {
    console.error(error);
  }
}

loadSite();

async function loadViewCount() {
  const viewCount = document.getElementById("viewCount");

  if (!viewCount) return;

  try {
    const response = await fetch("/api/view", {
      method: "POST"
    });

    const data = await response.json();

    if (typeof data.total === "number") {
      viewCount.textContent = data.total;
    } else {
      viewCount.textContent = "0";
      console.log("View count response missing total:", data);
    }
  } catch (error) {
    viewCount.textContent = "0";
    console.log("View count failed:", error);
  }
}

loadViewCount();


const titleText = "VEXL";
let titleIndex = 1;
let deleting = false;

function animateTitle() {
  if (!deleting) {
    titleIndex++;

    if (titleIndex >= titleText.length) {
      titleIndex = titleText.length;
      deleting = true;
      document.title = titleText;
      setTimeout(animateTitle, 1400);
      return;
    }
  } else {
    titleIndex--;

    // Do not go below 1, or Chrome may show the website URL.
    if (titleIndex <= 1) {
      titleIndex = 1;
      deleting = false;
      document.title = titleText.slice(0, titleIndex);
      setTimeout(animateTitle, 500);
      return;
    }
  }

  document.title = titleText.slice(0, titleIndex);
  setTimeout(animateTitle, deleting ? 130 : 180);
}

animateTitle();

async function updateActiveCount() {
  const activeCount = document.getElementById("activeCount");

  if (!activeCount) return;

  try {
    const response = await fetch("/api/active", {
      method: "POST"
    });

    const data = await response.json();
    activeCount.textContent = data.active;
  } catch (error) {
    console.log("Active count failed:", error);
  }
}

updateActiveCount();
setInterval(updateActiveCount, 15000);