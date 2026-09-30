chrome.runtime.onMessage.addListener((message) => {
  if (message.action !== "IMPORT_GRADES") return;

  startPowerSchoolImport();
});

// Resume an import automatically after PowerSchool navigates
resumeImportIfNeeded();

async function startPowerSchoolImport() {
  // We are on the Grades & Attendance page
  if (!window.location.pathname.includes("/guardian/scores.html")) {
    await startFromGradesPage();
    return;
  }

  // We are on a class's S1 page
  await processCurrentClass();
}


// ------------------------------------------------------------
// STEP 1: Find all S1 class pages
// ------------------------------------------------------------

async function startFromGradesPage() {
  const links = Array.from(
    document.querySelectorAll('a[href*="scores.html"]')
  );

  const classesByFrn = new Map();

  for (const link of links) {
    const rawHref = link.getAttribute("href");
    if (!rawHref) continue;

    const url = new URL(rawHref, window.location.href);

    if (!url.pathname.includes("/guardian/scores.html")) {
      continue;
    }

    const frn = url.searchParams.get("frn");
    const term = url.searchParams.get("fg");

    // Only use S1
    if (!frn || term !== "S1") {
      continue;
    }

    // Keep only one S1 link per class
    if (!classesByFrn.has(frn)) {
      classesByFrn.set(frn, {
        frn,
        url: url.href,
      });
    }
  }

  const queue = Array.from(classesByFrn.values());

  console.log("PowerSchool S1 classes found:", queue);

  if (queue.length === 0) {
    alert("No S1 classes were found on this PowerSchool page.");
    return;
  }

  const job = {
    active: true,
    queue,
    currentIndex: 0,
    results: [],
  };

  await chrome.storage.local.set({
    powerschoolImportJob: job,
  });

  console.log(
    `Starting PowerSchool import: ${queue.length} classes`
  );

  // Go to the first class
  window.location.href = queue[0].url;
}


// ------------------------------------------------------------
// STEP 2: Resume after navigating to a class
// ------------------------------------------------------------

async function resumeImportIfNeeded() {
  const stored = await chrome.storage.local.get(
    "powerschoolImportJob"
  );

  const job = stored.powerschoolImportJob;

  if (!job?.active) {
    return;
  }

  // Don't do anything on unrelated PowerSchool pages
  if (!window.location.pathname.includes("/guardian/scores.html")) {
    return;
  }

  // Give Angular/PowerSchool a moment to finish loading
  setTimeout(() => {
    processCurrentClass();
  }, 800);
}


// ------------------------------------------------------------
// STEP 3: Expand all assignments and collect standards
// ------------------------------------------------------------

async function processCurrentClass() {
  const stored = await chrome.storage.local.get(
    "powerschoolImportJob"
  );

  const job = stored.powerschoolImportJob;

  if (!job?.active) {
    return;
  }

  const currentClass = job.queue[job.currentIndex];

  if (!currentClass) {
    await finishImport(job);
    return;
  }

  const currentFrn = new URL(window.location.href)
    .searchParams
    .get("frn");

  // Make sure we're processing the expected class
  if (currentFrn !== currentClass.frn) {
    console.log(
      "Waiting for expected class:",
      currentClass.frn
    );
    return;
  }

  console.log(
    `Processing class ${job.currentIndex + 1} of ${job.queue.length}:`,
    currentFrn
  );

  // Wait for assignment buttons to appear
  await waitForAssignmentButtons();

  // Click every "show standards" button
  const buttons = Array.from(
    document.querySelectorAll(
      'button[ng-click="studentAssignmentScoresCtrlData.showStandardsToggle(studentAssignment)"]'
    )
  );

  console.log(
    "Standard toggle buttons:",
    buttons.length
  );

  buttons.forEach((button) => {
    const assignmentRow = button.closest("tr");

    const isExcluded =
      assignmentRow?.querySelector(".tt-excluded") !== null;

    console.log(
      "Assignment excluded:",
      isExcluded
    );

    if (!isExcluded) {
      button.click();
    }
  });

  // Wait for standards to load
  await waitForStandardsToLoad();

  const result = scrapeCurrentClass();

  console.log("Class result:", result);

  // Skip classes that have no standards
  if (result.standards.length === 0) {
    console.log(
      "Skipping class with no standards:",
      result.name
    );

    job.currentIndex++;

    await chrome.storage.local.set({
      powerschoolImportJob: job,
    });

    if (job.currentIndex < job.queue.length) {
      const nextClass = job.queue[job.currentIndex];

      console.log(
        `Skipping to class ${job.currentIndex + 1} of ${job.queue.length}`
      );

      window.location.href = nextClass.url;
      return;
    }

    await finishImport(job);
    return;
  }

  // Keep classes that have standards
  job.results.push(result);
  job.currentIndex++;

  await chrome.storage.local.set({
    powerschoolImportJob: job,
  });

  await chrome.storage.local.set({
    powerschoolImportJob: job,
  });

  // More classes remaining
  if (job.currentIndex < job.queue.length) {
    const nextClass = job.queue[job.currentIndex];

    console.log(
      `Moving to class ${job.currentIndex + 1} of ${job.queue.length}`
    );

    window.location.href = nextClass.url;
    return;
  }

  // All classes finished
  await finishImport(job);
}


// ------------------------------------------------------------
// STEP 4: Wait helpers
// ------------------------------------------------------------

function waitForAssignmentButtons() {
  return new Promise((resolve) => {
    let attempts = 0;

    const check = setInterval(() => {
      attempts++;

      const buttons = document.querySelectorAll(
        'button[ng-click="studentAssignmentScoresCtrlData.showStandardsToggle(studentAssignment)"]'
      );

      if (buttons.length > 0) {
        clearInterval(check);
        resolve();
        return;
      }

      // Don't wait forever
      if (attempts >= 2) {
        clearInterval(check);
        resolve();
      }
    }, 500);
  });
}


function waitForStandardsToLoad() {
  return new Promise((resolve) => {
    let attempts = 0;
    let lastCount = -1;
    let stableChecks = 0;

    const check = setInterval(() => {
      attempts++;

      const count = document.querySelectorAll(
        "tr.sub.standard"
      ).length;

      // Standards found and finished loading
      if (count > 0) {
        if (count === lastCount) {
          stableChecks++;
        } else {
          stableChecks = 0;
          lastCount = count;
        }

        // Same number of standards twice in a row
        if (stableChecks >= 2) {
          clearInterval(check);
          resolve(count);
          return;
        }
      }

      // No standards exist in this class.
      // Give PowerSchool a few seconds to load them first,
      // then treat the class as having zero standards.
      if (attempts >= 10) {
        clearInterval(check);
        resolve(count);
      }
    }, 500);
  });
}


// ------------------------------------------------------------
// STEP 5: Scrape the current class
// ------------------------------------------------------------

function scrapeCurrentClass() {
  let courseName = "";
  let teacher = "";
  let finalGrade = "";

  const detailRow = Array.from(
    document.querySelectorAll(
      "table.linkDescList tbody tr"
    )
  ).find((row) => {
    const cells = Array.from(
      row.querySelectorAll("td")
    ).map((td) => td.innerText.trim());

    return (
      cells.length >= 5 &&
      cells[0] &&
      cells[1]
    );
  });

  if (detailRow) {
    const cells = Array.from(
      detailRow.querySelectorAll("td")
    ).map((td) => td.innerText.trim());

    courseName = cells[0];
    teacher = cells[1];
    finalGrade = cells[4];
  }

  const rows = Array.from(
    document.querySelectorAll("tr.sub.standard")
  );

 const standards = [];

  rows.forEach((row) => {
    const code =
      row.querySelector("strong")
        ?.innerText
        .trim() || "";

    if (!code) return;

    const fullText =
      row.querySelector("td[colspan='3']")
        ?.innerText
        .trim() || "";

    const description = fullText
      .replace(code, "")
      .replace(/^\s*-\s*/, "")
      .trim();

    const scoreText =
      row.querySelector('td[align="center"] span')
        ?.innerText
        .replace("Score", "")
        .trim() || "";

    const score =
      scoreText === "--"
        ? ""
        : scoreText;

    // Keep EVERY assessment, even when the standard code
    // is repeated multiple times.
    if (score) {
      standards.push({
        code,
        description,
        score,
      });
    }
  });
    console.log(
    `Found ${standards.length} standard assessments for ${courseName}:`,
    standards
  );

  return {
    name: courseName,
    teacher,
    grade: finalGrade,
    standards,
  };
}

// ------------------------------------------------------------
// STEP 6: Finish and download one JSON file
// ------------------------------------------------------------

async function finishImport(job) {
  console.log(
    "PowerSchool import complete:",
    job.results
  );

  downloadJSON(job.results);

  await chrome.storage.local.remove(
    "powerschoolImportJob"
  );

  alert(
    `PowerSchool import complete!\n\n${job.results.length} classes imported.`
  );
}


// ------------------------------------------------------------
// Download
// ------------------------------------------------------------

function downloadJSON(data) {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    {
      type: "application/json",
    }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "powerschool-grades.json";

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}