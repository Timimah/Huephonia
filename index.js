// When the page loads, initialize with "{1}| "
window.onload = function () {
  document.getElementById("inputText").value = "";
  const inputText = document.getElementById("inputText");
  if (!inputText.value) {
    inputText.value = "{1}| ";
  }
};

const colorMap = {
  R: "#f2f2f2",
  Cmm: "#991732",
  Dbmm: "#bf4426",
  Dmm: "#bf8f28",
  Ebmm: "#a6a022",
  Emm: "#9aad29",
  Fmm: "#5f9933",
  Fsmm: "#4c997f",
  Gmm: "#207099",
  Abmm: "#3023a3",
  Amm: "#6b1da3",
  Bbmm: "#a31da3",
  Bmm: "#bf2e72",
  Cm: "#c41e40",
  Dbm: "#e6512f",
  Dm: "#e6ad31",
  Ebm: "#d0ca2b",
  Em: "#b6cc31",
  Fm: "#6fb33c",
  Fsm: "#59b394",
  Gm: "#2683b3",
  Abm: "#3c2bcc",
  Am: "#8821cc",
  Bbm: "#cc21cc",
  Bm: "#e63a8a",
  C: "#ee3c5c",
  Db: "#ff6e4d",
  D: "#fbc900",
  Eb: "#e0d92c",
  E: "#cee637",
  F: "#86cc51",
  Fs: "#6ddeb8",
  G: "#2da8e6",
  Ab: "#7c6ef5",
  A: "#b347f5",
  Bb: "#f030f0",
  B: "#f078b0",
  Cp: "#ff7070",
  Dbp: "#ff9780",
  Dp: "#ffe16b",
  Ebp: "#f5ed30",
  Ep: "#e3f562",
  Fp: "#aee388",
  Fsp: "#90f0cf",
  Gp: "#79c9f2",
  Abp: "#988cff",
  Ap: "#d699ff",
  Bbp: "#ff80ff",
  Bp: "#ff99c9",
};

const caseInsensitiveColorMap = Object.fromEntries(
  Object.entries(colorMap).map(([key, value]) => [key.toLowerCase(), value])
);

function getColor(note) {
  return caseInsensitiveColorMap[note.toLowerCase()];
}

function downloadSVG() {
  const visualResultNoNotes = document.getElementById("visualResultNoNotes");
  const lines = visualResultNoNotes.getElementsByClassName("line-container");
  const titleDisplay = document.getElementById("titleDisplay");

  let fileName = titleDisplay.textContent.trim();
  if (fileName === "Untitled" || !fileName) {
    fileName = "music_notation";
  }
  fileName = fileName.replace(/[^a-z0-9]/gi, "_").toLowerCase();

  let maxWidth = 0;
  Array.from(lines).forEach((line) => {
    // Skip the line-number div and only process note divs
    const notes = Array.from(line.children).slice(1); // Skip first child (line number)
    const lineWidth = notes.reduce((sum, note) => {
      const computedStyle = window.getComputedStyle(note);
      const width = parseFloat(computedStyle.width);
      return sum + width;
    }, 0);
    maxWidth = Math.max(maxWidth, lineWidth);
  });

  const height = lines.length * 60; // 48px height + 12px margin
  const padding = 20; // Add padding to SVG
  const totalWidth = maxWidth + padding * 2;
  const totalHeight = height + padding * 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}">`;

  // Add a background rectangle (optional)
  svg += `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="white"/>`;

  Array.from(lines).forEach((line, lineIndex) => {
    let xOffset = padding; // Start after padding
    // Skip the line-number div and only process note divs
    const notes = Array.from(line.children).slice(1); // Skip first child (line number)
    notes.forEach((note) => {
      const computedStyle = window.getComputedStyle(note);
      const width = parseFloat(computedStyle.width);
      const y = lineIndex * 60 + padding; // Add padding to y position
      const color = note.style.backgroundColor;

      svg += `<rect x="${xOffset}" y="${y}" width="${width}" height="48" 
                   fill="${color}" stroke="#353638" stroke-width="0.75"/>`;

      xOffset += width;
    });
  });

  svg += "</svg>";

  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function updateLineNumbers() {
  const input = document.getElementById("inputText");
  let text = input.value;

  // Remove existing line numbers
  text = text.replace(/^\{?\*?\d+\*?\}?\|\s*/gm, "");

  // Add new line numbers with bold formatting
  const lines = text.split("\n");
  const numberedLines = lines.map((line, index) => `{${index + 1}}| ${line}`);

  // Update the textarea while preserving cursor position
  const cursorPosition = input.selectionStart;
  const lineBreaksBeforeCursor =
    text.substr(0, cursorPosition).split("\n").length - 1;
  const additionalCharsPerLine = lines.length.toString().length + 6; // length of number + "{*" + "*}| "

  input.value = numberedLines.join("\n");

  // Adjust cursor position
  const newPosition =
    cursorPosition + (lineBreaksBeforeCursor + 1) * additionalCharsPerLine;
  input.setSelectionRange(newPosition, newPosition);
}

function parseNotes() {
  const input = document.getElementById("inputText").value;
  const resultDiv = document.getElementById("result");
  const visualResult = document.getElementById("visualResult");
  const visualResultNoNotes = document.getElementById("visualResultNoNotes");
  const unmappedNotesDiv = document.getElementById("unmappedNotes");

  visualResult.innerHTML = "";
  visualResultNoNotes.innerHTML = "";
  unmappedNotesDiv.innerHTML = "";

  const unmappedNotes = new Set();

  const cleanText = input.trim().replace(/^\{|\}$/g, "");
  const lines = cleanText.split("\n");

  let result = lines.map((line) => {
    const notePattern = /([A-Za-z]+(?:b|p)?)(?:\((\d*\.?\d+)\))/g;
    const matches = [];
    let match;

    while ((match = notePattern.exec(line)) !== null) {
      const [fullMatch, note] = match;
      if (!getColor(note)) {
        unmappedNotes.add(note);
      }
      matches.push(fullMatch);
    }

    return matches;
  });

  result = result.filter((line) => line.length > 0);

  resultDiv.textContent = JSON.stringify(result, null, 2);

  if (unmappedNotes.size > 0) {
    unmappedNotesDiv.innerHTML = `
            <h3>Notes without color mappings:</h3>
            <ul>
                ${Array.from(unmappedNotes)
                  .map((note) => `<li>${note}</li>`)
                  .join("")}
            </ul>
        `;
  }

  result.forEach((line, index) => {
    const lineContainer = document.createElement("div");
    lineContainer.className = "line-container";

    const lineNumber = document.createElement("div");
    lineNumber.className = "line-number";
    lineNumber.textContent = index + 1;
    lineContainer.appendChild(lineNumber);

    const lineContainerNoNotes = document.createElement("div");
    lineContainerNoNotes.className = "line-container";

    const lineNumberNoNotes = document.createElement("div");
    lineNumberNoNotes.className = "line-number";
    lineNumberNoNotes.textContent = index + 1;
    lineContainerNoNotes.appendChild(lineNumberNoNotes);

    line.forEach((noteStr) => {
      const [_, note, duration] = noteStr.match(
        /([A-Za-z]+(?:b|p)?)(?:\((\d*\.?\d+)\))/
      );

      const noteDiv = document.createElement("div");
      noteDiv.className = "note";
      const width = Math.floor(parseFloat(duration) * 144);
      noteDiv.style.width = `${width}px`;
      noteDiv.style.backgroundColor = getColor(note) || "#ffffff";
      noteDiv.textContent = `${note}(${duration})`;
      lineContainer.appendChild(noteDiv);

      const noteDivNoNotes = document.createElement("div");
      const widthNoNotes = Math.floor(parseFloat(duration) * 48);
      noteDivNoNotes.className = "note";
      noteDivNoNotes.style.width = `${widthNoNotes}px`;
      noteDivNoNotes.style.backgroundColor = getColor(note) || "#ffffff";
      lineContainerNoNotes.appendChild(noteDivNoNotes);
    });

    visualResult.appendChild(lineContainer);
    visualResultNoNotes.appendChild(lineContainerNoNotes);
  });
}

function clearNotes() {
  document.getElementById("inputText").value = "{1}| ";
  document.getElementById("visualResult").innerHTML = "";
  document.getElementById("visualResultNoNotes").innerHTML = "";
  document.getElementById("result").innerHTML = "";
}

function confirmEdit(newValue, type = "title") {
  const display = document.getElementById(`${type}Display`);
  const container = document.querySelector(`.${type}-container`);
  const input = container.querySelector(`.${type}-input`);
  const confirmButton = container.querySelector(".confirm-button");

  // Update title or artist
  display.textContent = newValue || "Untitled";
  display.style.display = "block";

  // Remove input and confirm button
  if (input) input.remove();
  if (confirmButton) confirmButton.remove();
}

function editTitle() {
  const titleDisplay = document.getElementById("titleDisplay");
  const container = document.querySelector(".title-container");
  const currentTitle = titleDisplay.textContent;

  // Create input element
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentTitle;
  input.className = "title-input";

  // Create confirm button
  const confirmButton = document.createElement("button");
  confirmButton.className = "confirm-button";
  confirmButton.innerHTML = "✓";
  confirmButton.onclick = () => confirmEdit(input.value, "title");

  // Replace title with input and button
  titleDisplay.style.display = "none";
  container.insertBefore(input, titleDisplay);
  container.insertBefore(confirmButton, titleDisplay.nextSibling);

  // Focus input
  input.focus();

  // Handle enter key
  input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      confirmEdit(input.value, "title");
    }
  });
}

function editArtist() {
  const artistDisplay = document.getElementById("artistDisplay");
  const container = document.querySelector(".artist-container");
  const currentArtist = artistDisplay.textContent;

  // Create input element
  const input = document.createElement("input");
  input.type = "text";
  input.value = currentArtist;
  input.className = "artist-input";

  // Create confirm button
  const confirmButton = document.createElement("button");
  confirmButton.className = "confirm-button";
  confirmButton.innerHTML = "✓";
  confirmButton.onclick = () => confirmEdit(input.value, "artist");

  // Replace artist with input and button
  artistDisplay.style.display = "none";
  container.insertBefore(input, artistDisplay);
  container.insertBefore(confirmButton, artistDisplay.nextSibling);

  // Focus input
  input.focus();

  // Handle enter key
  input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      confirmEdit(input.value, "artist");
    }
  });
}
