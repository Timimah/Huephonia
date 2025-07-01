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
}

// Frequency mapping based on A440 (A4 = 440 Hz)
const noteToFreq = {
  // Lower octave (mm)
  Cmm: 65.41, // C2
  Dbmm: 69.3, // C#2/Db2
  Dmm: 73.42,
  Ebmm: 77.78,
  Emm: 82.41,
  Fmm: 87.31,
  Fsmm: 92.5,
  Gmm: 98.0,
  Abmm: 103.83,
  Amm: 110.0,
  Bbmm: 116.54,
  Bmm: 123.47,

  // Middle-lower octave (m)
  Cm: 130.81, // C3
  Dbm: 138.59,
  Dm: 146.83,
  Ebm: 155.56,
  Em: 164.81,
  Fm: 174.61,
  Fsm: 185.0,
  Gm: 196.0,
  Abm: 207.65,
  Am: 220.0,
  Bbm: 233.08,
  Bm: 246.94,

  // Middle octave
  C: 261.63, // C4 (middle C)
  Db: 277.18,
  D: 293.66,
  Eb: 311.13,
  E: 329.63,
  F: 349.23,
  Fs: 369.99,
  G: 392.0,
  Ab: 415.3,
  A: 440.0, // A4 (reference pitch)
  Bb: 466.16,
  B: 493.88,

  // Higher octave (p)
  Cp: 523.25, // C5
  Dbp: 554.37,
  Dp: 587.33,
  Ebp: 622.25,
  Ep: 659.25,
  Fp: 698.46,
  Fsp: 739.99,
  Gp: 783.99,
  Abp: 830.61,
  Ap: 880.0,
  Bbp: 932.33,
  Bp: 987.77,

  R: 0, // Rest
}

// Shared audio context and state
let currentContext = null
let activeOscillators = new Set()
let isPlaying = false

// Shared audio functions
async function initAudioContext() {
  try {
    if (!currentContext) {
      currentContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (currentContext.state === "suspended") {
      await currentContext.resume()
    }
    return currentContext
  } catch (error) {
    console.error("Error initializing AudioContext:", error)
    throw error
  }
}

function createSoundChain(context, frequency, currentTime, duration) {
  try {
    // Get instrument settings
    const settings = instruments[currentInstrument]

    // Safety checks
    if (!context || !frequency || !currentTime || !duration) {
      console.error("Missing required parameters")
      return null
    }

    // Ensure duration is reasonable
    duration = Math.min(Math.max(duration, 0.1), 10) // Between 0.1 and 10 seconds

    // Create and configure oscillators
    const mainOsc = context.createOscillator()
    const subOsc = context.createOscillator()

    // Add oscillators to tracking set
    activeOscillators.add(mainOsc)
    activeOscillators.add(subOsc)

    mainOsc.type = settings.mainOscType
    mainOsc.frequency.value = frequency

    subOsc.type = settings.subOscType
    subOsc.frequency.value = frequency * 1.01

    // Create gain nodes
    const mainGain = context.createGain()
    const subGain = context.createGain()
    const masterGain = context.createGain()

    // Create reverb with safety limits
    const convolver = context.createConvolver()
    const rate = context.sampleRate
    const length = Math.min(rate * settings.reverbTime, rate * 3) // Limit reverb length
    const impulse = context.createBuffer(2, length, rate)

    for (let channel = 0; channel < 2; channel++) {
      const impulseData = impulse.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 10)
      }
    }
    convolver.buffer = impulse

    // Configure filter
    const filter = context.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = Math.min(settings.filterFreq, 5000) // Safety limit
    filter.Q.value = 0.5

    // Connect audio nodes
    mainOsc.connect(mainGain)
    subOsc.connect(subGain)
    mainGain.connect(masterGain)
    subGain.connect(masterGain)
    masterGain.connect(filter)
    filter.connect(convolver)
    convolver.connect(context.destination)
    filter.connect(context.destination)

    // Calculate safe envelope times
    const attackTime = Math.min(settings.attackTime, duration * 0.3)
    const releaseTime = Math.min(settings.releaseTime, duration * 0.3)

    // Set volume envelopes with safety checks
    const now = currentTime
    mainGain.gain.setValueAtTime(0, now)
    mainGain.gain.linearRampToValueAtTime(
      settings.mainGainValue,
      now + attackTime
    )
    mainGain.gain.setValueAtTime(
      settings.mainGainValue,
      now + duration - releaseTime
    )
    mainGain.gain.linearRampToValueAtTime(0, now + duration)

    subGain.gain.setValueAtTime(0, now)
    subGain.gain.linearRampToValueAtTime(
      settings.subGainValue,
      now + attackTime
    )
    subGain.gain.setValueAtTime(
      settings.subGainValue,
      now + duration - releaseTime
    )
    subGain.gain.linearRampToValueAtTime(0, now + duration)

    masterGain.gain.value = 0.3

    return {
      start: () => {
        try {
          mainOsc.start(currentTime)
          subOsc.start(currentTime)
          mainOsc.stop(currentTime + duration)
          subOsc.stop(currentTime + duration)

          // Remove oscillators from tracking after they finish
          setTimeout(() => {
            activeOscillators.delete(mainOsc)
            activeOscillators.delete(subOsc)
          }, (duration + 0.1) * 1000)
        } catch (error) {
          console.error("Error starting oscillators:", error)
        }
      },
    }
  } catch (error) {
    console.error("Error in createSoundChain:", error)
    return null
  }
}

// Shared utility functions

function normalizeColor(color) {
  // Remove spaces and convert to lowercase
  color = color.toLowerCase().replace(/\s/g, "")

  // Handle rgb/rgba format
  if (color.startsWith("rgb")) {
    const values = color.match(/\d+/g)
    if (values && values.length >= 3) {
      const [r, g, b] = values
      return `#${Number(r).toString(16).padStart(2, "0")}${Number(g)
        .toString(16)
        .padStart(2, "0")}${Number(b).toString(16).padStart(2, "0")}`
    }
  }

  return color
}

// Scan page specific functions
if (document.getElementById("imageCanvas")) {
  // Scan page initialization
  function showLoading() {
    document.querySelector(".loading-overlay").style.display = "flex"
  }

  function hideLoading() {
    document.querySelector(".loading-overlay").style.display = "none"
  }

  function rgbToHex(r, g, b) {
    const componentToHex = (c) => {
      const hex = Math.round(c).toString(16)
      return hex.length === 1 ? "0" + hex : hex
    }
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b)
  }

  function kMeansQuantization(imageData, k) {
    const pixels = []
    for (let i = 0; i < imageData.data.length; i += 4) {
      pixels.push([
        imageData.data[i],
        imageData.data[i + 1],
        imageData.data[i + 2],
      ])
    }

    // Initialize centroids randomly
    let centroids = Array.from({ length: k }, () => {
      const randomIndex = Math.floor(Math.random() * pixels.length)
      return pixels[randomIndex].slice()
    })

    const maxIterations = 10
    let iterations = 0
    let oldCentroids = null

    while (iterations < maxIterations) {
      // Assign pixels to nearest centroid
      const clusters = Array.from({ length: k }, () => [])

      pixels.forEach((pixel) => {
        let minDistance = Infinity
        let closestCentroid = 0

        centroids.forEach((centroid, i) => {
          const distance = Math.sqrt(
            Math.pow(pixel[0] - centroid[0], 2) +
              Math.pow(pixel[1] - centroid[1], 2) +
              Math.pow(pixel[2] - centroid[2], 2)
          )

          if (distance < minDistance) {
            minDistance = distance
            closestCentroid = i
          }
        })

        clusters[closestCentroid].push(pixel)
      })

      // Update centroids
      oldCentroids = centroids.slice()
      centroids = clusters.map((cluster) => {
        if (cluster.length === 0) return oldCentroids[0]
        return cluster.reduce(
          (acc, pixel) => {
            return [
              acc[0] + pixel[0] / cluster.length,
              acc[1] + pixel[1] / cluster.length,
              acc[2] + pixel[2] / cluster.length,
            ]
          },
          [0, 0, 0]
        )
      })

      iterations++
    }

    return centroids.map((centroid) =>
      rgbToHex(
        Math.round(centroid[0]),
        Math.round(centroid[1]),
        Math.round(centroid[2])
      )
    )
  }

  function medianCutQuantization(imageData, colorCount) {
    const pixels = []
    for (let i = 0; i < imageData.data.length; i += 4) {
      pixels.push({
        r: imageData.data[i],
        g: imageData.data[i + 1],
        b: imageData.data[i + 2],
      })
    }

    function findBiggestColorRange(pixels) {
      let rMin = 255,
        rMax = 0,
        gMin = 255,
        gMax = 0,
        bMin = 255,
        bMax = 0

      pixels.forEach((pixel) => {
        rMin = Math.min(rMin, pixel.r)
        rMax = Math.max(rMax, pixel.r)
        gMin = Math.min(gMin, pixel.g)
        gMax = Math.max(gMax, pixel.g)
        bMin = Math.min(bMin, pixel.b)
        bMax = Math.max(bMax, pixel.b)
      })

      const rRange = rMax - rMin
      const gRange = gMax - gMin
      const bRange = bMax - bMin

      const max = Math.max(rRange, gRange, bRange)

      if (max === rRange) return "r"
      if (max === gRange) return "g"
      return "b"
    }

    function medianCut(pixels, depth) {
      if (depth === 0 || pixels.length === 0) {
        const color = pixels.reduce(
          (acc, pixel) => {
            return {
              r: acc.r + pixel.r / pixels.length,
              g: acc.g + pixel.g / pixels.length,
              b: acc.b + pixel.b / pixels.length,
            }
          },
          { r: 0, g: 0, b: 0 }
        )

        return [
          rgbToHex(
            Math.round(color.r),
            Math.round(color.g),
            Math.round(color.b)
          ),
        ]
      }

      const component = findBiggestColorRange(pixels)
      pixels.sort((a, b) => a[component] - b[component])

      const mid = pixels.length >> 1
      return [
        ...medianCut(pixels.slice(0, mid), depth - 1),
        ...medianCut(pixels.slice(mid), depth - 1),
      ]
    }

    const depth = Math.log2(colorCount)
    return medianCut(pixels, depth)
  }

  function extractDominantColors(imageData, numColors) {
    const pixels = imageData.data
    const colorCounts = new Map()

    for (let i = 0; i < pixels.length; i += 16) {
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      const hex = rgbToHex(r, g, b)

      colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1)
    }

    return Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, numColors)
      .map((entry) => entry[0])
  }

  async function extractColors(imageData, numColors, algorithm) {
    showLoading()

    try {
      let colors
      switch (algorithm) {
        case "kmeans":
          colors = kMeansQuantization(imageData, numColors)
          break
        case "medianCut":
          colors = medianCutQuantization(imageData, numColors)
          break
        default:
          colors = extractDominantColors(imageData, numColors)
      }

      hideLoading()
      return colors
    } catch (error) {
      hideLoading()
      console.error("Error extracting colors:", error)
      return []
    }
  }

  async function playNote(note) {
    try {
      const context = await initAudioContext()
      const frequency = noteToFreq[note]

      if (!frequency) return // Rest or invalid note

      const oscillator = context.createOscillator()
      const gainNode = context.createGain()

      oscillator.type = "sine"
      oscillator.frequency.value = frequency

      gainNode.gain.setValueAtTime(0, context.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.01)
      gainNode.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.1)
      gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.2)

      oscillator.connect(gainNode)
      gainNode.connect(context.destination)

      activeOscillators.add(oscillator)

      oscillator.start()
      oscillator.stop(context.currentTime + 0.2)

      oscillator.onended = () => {
        oscillator.disconnect()
        gainNode.disconnect()
        activeOscillators.delete(oscillator)
      }
    } catch (error) {
      console.error("Error playing note:", error)
    }
  }

  function findNearestColor(hexColor) {
    // Remove the # if present
    hexColor = hexColor.replace("#", "")

    // Convert hex to RGB
    const r = parseInt(hexColor.substr(0, 2), 16)
    const g = parseInt(hexColor.substr(2, 2), 16)
    const b = parseInt(hexColor.substr(4, 2), 16)

    let minDistance = Infinity
    let nearestNote = null
    let nearestColor = null

    // Compare with each color in the colorMap
    Object.entries(colorMap).forEach(([note, color]) => {
      const targetHex = color.replace("#", "")
      const tr = parseInt(targetHex.substr(0, 2), 16)
      const tg = parseInt(targetHex.substr(2, 2), 16)
      const tb = parseInt(targetHex.substr(4, 2), 16)

      // Calculate Euclidean distance in RGB space
      const distance = Math.sqrt(
        Math.pow(r - tr, 2) + Math.pow(g - tg, 2) + Math.pow(b - tb, 2)
      )

      if (distance < minDistance) {
        minDistance = distance
        nearestNote = note
        nearestColor = color
      }
    })

    return nearestNote
  }

  function updateColorGrid(colors) {
    const colorGrid = document.getElementById("colorGrid")
    colorGrid.innerHTML = ""

    // Create a container for colors
    const gridContainer = document.createElement("div")
    gridContainer.style.display = "flex"
    gridContainer.style.flexWrap = "wrap"
    gridContainer.style.gap = "2px"

    colors.forEach((color) => {
      const note = findNearestColor(color)
      const mappedColor = colorMap[note]

      const cell = document.createElement("div")
      cell.className = "color-cell"
      cell.style.backgroundColor = mappedColor
      cell.style.width = "48px" // Match the width in huesWithNoNotes
      cell.style.height = "48px"
      cell.dataset.note = note

      cell.addEventListener("click", () => {
        playNote(note)
      })

      gridContainer.appendChild(cell)
    })

    colorGrid.appendChild(gridContainer)
  }

  document
    .getElementById("imageInput")
    .addEventListener("change", async (e) => {
      const file = e.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = async (event) => {
        const img = new Image()
        img.onload = async () => {
          const canvas = document.getElementById("imageCanvas")
          const ctx = canvas.getContext("2d")

          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const algorithm = document.getElementById("algorithmSelect").value
          const numColors = parseInt(
            document.getElementById("colorCount").value
          )

          const dominantColors = await extractColors(
            imageData,
            numColors,
            algorithm
          )
          updateColorGrid(dominantColors)
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    })

  document.getElementById("uploadButton").addEventListener("click", () => {
    document.getElementById("imageInput").click()
  })
}

// Index page specific functions
if (document.getElementById("inputText")) {
  // Index page initialization
  window.onload = function () {
    document.getElementById("inputText").value = ""
    const inputText = document.getElementById("inputText")
    if (!inputText.value) {
      inputText.value = "{1}| "
    }
    addPlayButton()
  }

  function updateLineNumbers() {
    const input = document.getElementById("inputText")
    let text = input.value

    // Remove existing line numbers
    text = text.replace(/^\{?\*?\d+\*?\}?\|\s*/gm, "")

    // Add new line numbers with bold formatting
    const lines = text.split("\n")
    const numberedLines = lines.map((line, index) => `{${index + 1}}| ${line}`)

    // Update the textarea while preserving cursor position
    const cursorPosition = input.selectionStart
    const lineBreaksBeforeCursor =
      text.substr(0, cursorPosition).split("\n").length - 1
    const additionalCharsPerLine = lines.length.toString().length + 6 // length of number + "{*" + "*}| "

    input.value = numberedLines.join("\n")

    // Adjust cursor position
    const newPosition =
      cursorPosition + (lineBreaksBeforeCursor + 1) * additionalCharsPerLine
    input.setSelectionRange(newPosition, newPosition)
  }

  const caseInsensitiveColorMap = Object.fromEntries(
    Object.entries(colorMap).map(([key, value]) => [key.toLowerCase(), value])
  )

  function getColor(note) {
    return caseInsensitiveColorMap[note.toLowerCase()]
  }

  function parseNotes() {
    const input = document.getElementById("inputText").value
    const resultDiv = document.getElementById("result")
    const visualResult = document.getElementById("visualResult")
    const visualResultNoNotes = document.getElementById("visualResultNoNotes")
    const unmappedNotesDiv = document.getElementById("unmappedNotes")

    visualResult.innerHTML = ""
    visualResultNoNotes.innerHTML = ""
    unmappedNotesDiv.innerHTML = ""

    const unmappedNotes = new Set()

    const cleanText = input.trim().replace(/^\{|\}$/g, "")
    const lines = cleanText.split("\n")

    let result = lines.map((line) => {
      const notePattern = /([A-Za-z]+(?:b|p)?)(?:\((\d*\.?\d+)\))/g
      const matches = []
      let match

      while ((match = notePattern.exec(line)) !== null) {
        const [fullMatch, note] = match
        if (!getColor(note)) {
          unmappedNotes.add(note)
        }
        matches.push(fullMatch)
      }

      return matches
    })

    result = result.filter((line) => line.length > 0)

    resultDiv.textContent = JSON.stringify(result, null, 2)

    if (unmappedNotes.size > 0) {
      unmappedNotesDiv.innerHTML = `
                  <h3>Notes without color mappings:</h3>
                  <ul>
                      ${Array.from(unmappedNotes)
                        .map((note) => `<li>${note}</li>`)
                        .join("")}
                  </ul>
              `
    }

    result.forEach((line, index) => {
      const lineContainer = document.createElement("div")
      lineContainer.className = "line-container"

      const lineNumber = document.createElement("div")
      lineNumber.className = "line-number"
      lineNumber.textContent = index + 1
      lineContainer.appendChild(lineNumber)

      const lineContainerNoNotes = document.createElement("div")
      lineContainerNoNotes.className = "line-container"

      const lineNumberNoNotes = document.createElement("div")
      lineNumberNoNotes.className = "line-number"
      lineNumberNoNotes.textContent = index + 1
      lineContainerNoNotes.appendChild(lineNumberNoNotes)

      line.forEach((noteStr) => {
        const [_, note, duration] = noteStr.match(
          /([A-Za-z]+(?:b|p)?)(?:\((\d*\.?\d+)\))/
        )

        const noteDiv = document.createElement("div")
        noteDiv.className = "note"
        const width = Math.floor(parseFloat(duration) * 144)
        noteDiv.style.width = `${width}px`
        noteDiv.style.backgroundColor = getColor(note) || "#ffffff"
        noteDiv.textContent = `${note}(${duration})`
        lineContainer.appendChild(noteDiv)

        const noteDivNoNotes = document.createElement("div")
        const widthNoNotes = Math.floor(parseFloat(duration) * 48)
        noteDivNoNotes.className = "note"
        noteDivNoNotes.style.width = `${widthNoNotes}px`
        noteDivNoNotes.style.backgroundColor = getColor(note) || "#ffffff"
        lineContainerNoNotes.appendChild(noteDivNoNotes)
      })

      visualResult.appendChild(lineContainer)
      visualResultNoNotes.appendChild(lineContainerNoNotes)
    })
  }

  function clearNotes() {
    document.getElementById("inputText").value = "{1}| "
    document.getElementById("visualResult").innerHTML = ""
    document.getElementById("visualResultNoNotes").innerHTML = ""
    document.getElementById("result").innerHTML = ""
    console.log("Notes Cleared!")
  }

  function editTitle() {
    const titleDisplay = document.getElementById("titleDisplay")
    const container = document.querySelector(".title-container")
    const currentTitle = titleDisplay.textContent

    // Create input element
    const input = document.createElement("input")
    input.type = "text"
    input.placeholder = currentTitle
    input.className = "title-input"

    // Create confirm button
    const confirmButton = document.createElement("button")
    confirmButton.className = "confirm-button"
    confirmButton.innerHTML = "✓"
    confirmButton.onclick = () => confirmEdit(input.value, "title")

    // Replace title with input and button
    titleDisplay.style.display = "none"
    container.insertBefore(input, titleDisplay)
    container.insertBefore(confirmButton, titleDisplay.nextSibling)

    // Focus input
    input.focus()

    // Handle enter key
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        confirmEdit(input.value, "title")
      }
    })
  }

  function editArtist() {
    const artistDisplay = document.getElementById("artistDisplay")
    const container = document.querySelector(".artist-container")
    const currentArtist = artistDisplay.textContent

    // Create input element
    const input = document.createElement("input")
    input.type = "text"
    input.placeholder = currentArtist
    input.className = "artist-input"

    // Create confirm button
    const confirmButton = document.createElement("button")
    confirmButton.className = "confirm-button"
    confirmButton.innerHTML = "✓"
    confirmButton.onclick = () => confirmEdit(input.value, "artist")

    // Replace artist with input and button
    artistDisplay.style.display = "none"
    container.insertBefore(input, artistDisplay)
    container.insertBefore(confirmButton, artistDisplay.nextSibling)

    // Focus input
    input.focus()

    // Handle enter key
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        confirmEdit(input.value, "artist")
      }
    })
  }

  // Add index page event listeners
  document.getElementById("clearNotes").addEventListener("click", clearNotes)
}

// Shared music playback functions
const instruments = {
  piano: {
    mainOscType: "sine",
    subOscType: "triangle",
    filterFreq: 2000,
    attackTime: 0.1,
    releaseTime: 0.3,
    mainGainValue: 0.5,
    subGainValue: 0.15,
    reverbTime: 2,
  },
  guitar: {
    mainOscType: "sawtooth",
    subOscType: "triangle",
    filterFreq: 1500,
    attackTime: 0.05,
    releaseTime: 0.1,
    mainGainValue: 0.3,
    subGainValue: 0.1,
    reverbTime: 1.5,
  },
  organ: {
    mainOscType: "square",
    subOscType: "square",
    filterFreq: 2500,
    attackTime: 0.02,
    releaseTime: 0.02,
    mainGainValue: 0.2,
    subGainValue: 0.1,
    reverbTime: 1,
  },
}

let currentInstrument = "piano"

function changeInstrument(instrumentName) {
  if (instruments[instrumentName]) {
    currentInstrument = instrumentName
    console.log("Changed instrument to:", instrumentName)
  } else {
    console.error("Invalid instrument name")
  }
}

async function playGeneratedArt() {
  if (isPlaying) {
    console.log("Already playing")
    return
  }

  try {
    isPlaying = true
    updatePlayStopButtons()

    const context = await initAudioContext()
    if (!context) {
      throw new Error("Could not initialize audio context")
    }

    const visualResultNoNotes = document.getElementById("visualResultNoNotes")
    const lines = visualResultNoNotes.getElementsByClassName("line-container")

    let allNotes = []
    Array.from(lines).forEach((line) => {
      const notes = Array.from(line.children).slice(1)
      allNotes = allNotes.concat(Array.from(notes))
    })

    let currentTime = context.currentTime

    for (const noteElement of allNotes) {
      try {
        const backgroundColor = normalizeColor(
          noteElement.style.backgroundColor
        )
        const colorToNote = Object.entries(colorMap).reduce(
          (acc, [note, color]) => {
            acc[normalizeColor(color)] = note
            return acc
          },
          {}
        )

        const noteKey = colorToNote[backgroundColor]

        if (noteKey && noteToFreq[noteKey] !== undefined) {
          const width = parseFloat(getComputedStyle(noteElement).width)
          const duration = width / 48

          if (noteKey !== "R") {
            const frequency = noteToFreq[noteKey]
            const sound = createSoundChain(
              context,
              frequency,
              currentTime,
              duration
            )
            if (sound) {
              sound.start()
            }
          }

          currentTime += duration
        }
      } catch (error) {
        console.error("Error processing note:", error)
        continue // Skip problematic notes instead of crashing
      }
    }
  } catch (error) {
    console.error("Error playing music:", error)
    alert("There was an error playing the music. Please try again.")
  }
}

function stopPlaying() {
  if (currentContext) {
    // Stop all active oscillators
    activeOscillators.forEach((osc) => {
      try {
        osc.stop()
        osc.disconnect()
      } catch (e) {
        console.log("Oscillator already stopped")
      }
    })
    activeOscillators.clear()

    // Close the current context
    currentContext.close()
    currentContext = null
    isPlaying = false

    // Update button states
    updatePlayStopButtons()
  }
}

function updatePlayStopButtons() {
  const playButton = document.getElementById("playMusicButton")
  const stopButton = document.getElementById("stopMusicButton")

  if (playButton) {
    playButton.disabled = isPlaying
    playButton.style.cssText = `
        padding: 10px 20px;
        background-color: ${isPlaying ? "#ccc" : "#4CAF50"};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: ${isPlaying ? "not-allowed" : "pointer"};
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background-color 0.3s;
      `
  }

  if (stopButton) {
    stopButton.disabled = !isPlaying
    stopButton.style.cssText = `
        padding: 10px 20px;
        background-color: ${isPlaying ? "#f44336" : "#ccc"};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: ${isPlaying ? "pointer" : "not-allowed"};
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background-color 0.3s;
      `
  }
}

function addPlayButton() {
  // Remove existing buttons if they exist
  const existingPlayButton = document.getElementById("playMusicButton")
  const existingStopButton = document.getElementById("stopMusicButton")
  if (existingPlayButton) existingPlayButton.remove()
  if (existingStopButton) existingStopButton.remove()

  // Create container for buttons
  const buttonContainer = document.createElement("div")
  buttonContainer.style.cssText = `
      display: flex;
      gap: 10px;
      margin: 10px 0;
    `

  // Create play button
  const playButton = document.createElement("button")
  playButton.id = "playMusicButton"
  playButton.onclick = playGeneratedArt

  // Add play icon
  const playIcon = document.createElement("span")
  playIcon.innerHTML = "▶"
  playIcon.style.fontSize = "12px"
  playButton.appendChild(playIcon)

  // Create stop button
  const stopButton = document.createElement("button")
  stopButton.id = "stopMusicButton"
  stopButton.onclick = stopPlaying

  // Add stop icon
  const stopIcon = document.createElement("span")
  stopIcon.innerHTML = "■"
  stopIcon.style.fontSize = "12px"
  stopButton.appendChild(stopIcon)

  // Add buttons to container
  buttonContainer.appendChild(playButton)
  buttonContainer.appendChild(stopButton)

  // Add container to page
  const piamoIns = document.getElementById("piamoIns")
  piamoIns.parentNode.insertBefore(buttonContainer, piamoIns)

  // Initial button states
  updatePlayStopButtons()
}

function downloadSVG() {
  const visualResultNoNotes = document.getElementById("visualResultNoNotes")
  const lines = visualResultNoNotes.getElementsByClassName("line-container")
  const titleDisplay = document.getElementById("titleDisplay")
  const artistDisplay = document.getElementById("artistDisplay")

  let fileName =
    titleDisplay.textContent.trim() + "_" + artistDisplay.textContent.trim()
  if (fileName === "Untitled" || !fileName) {
    fileName = "music_notation"
  }
  fileName = fileName.replace(/[^a-z0-9]/gi, "_").toLowerCase()

  let maxWidth = 0
  Array.from(lines).forEach((line) => {
    // Skip the line-number div and only process note divs
    const notes = Array.from(line.children).slice(1) // Skip first child (line number)
    const lineWidth = notes.reduce((sum, note) => {
      const computedStyle = window.getComputedStyle(note)
      const width = parseFloat(computedStyle.width)
      return sum + width
    }, 0)
    maxWidth = Math.max(maxWidth, lineWidth)
  })

  const height = lines.length * 60 // 48px height + 12px margin
  const padding = 20 // Add padding to SVG
  const totalWidth = maxWidth + padding * 2
  const totalHeight = height + padding * 2

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}">`

  // Add a background rectangle (optional)
  svg += `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="white"/>`

  Array.from(lines).forEach((line, lineIndex) => {
    let xOffset = padding // Start after padding
    // Skip the line-number div and only process note divs
    const notes = Array.from(line.children).slice(1) // Skip first child (line number)
    notes.forEach((note) => {
      const computedStyle = window.getComputedStyle(note)
      const width = parseFloat(computedStyle.width)
      const y = lineIndex * 60 + padding // Add padding to y position
      const color = note.style.backgroundColor

      svg += `<rect x="${xOffset}" y="${y}" width="${width}" height="48" 
                   fill="${color}" stroke="#353638" stroke-width="0.75"/>`

      xOffset += width
    })
  })

  svg += "</svg>"

  const blob = new Blob([svg], { type: "image/svg+xml" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${fileName}.svg`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
