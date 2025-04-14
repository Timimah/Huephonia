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

// Add at the beginning of scan.js, after the noteToFreq definition
let currentContext = null
let activeOscillators = new Set()

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

// Add this to your HTML after the existing controls div in scan.html
const controlsDiv = document.querySelector(".controls")
const clearButton = document.createElement("button")
clearButton.id = "clearButton"
clearButton.textContent = "Clear"
clearButton.onclick = clearImage
controlsDiv.appendChild(clearButton)

// Add this function to scan.js
function clearImage() {
  const canvas = document.getElementById("imageCanvas")
  const ctx = canvas.getContext("2d")
  const colorGrid = document.getElementById("colorGrid")

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  canvas.width = 0
  canvas.height = 0

  // Clear the color grid
  colorGrid.innerHTML = ""

  // Reset the file input
  document.getElementById("imageInput").value = ""
}

// K-means clustering algorithm
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

// Median cut quantization
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
        rgbToHex(Math.round(color.r), Math.round(color.g), Math.round(color.b)),
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

// Modified color extraction function
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

// Your existing event listeners and utility functions here
// Make sure to modify the image upload handler to use the new extractColors function:

document.getElementById("imageInput").addEventListener("change", async (e) => {
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
      const numColors = parseInt(document.getElementById("colorCount").value)

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

// Add this near the end of scan.js
window.addEventListener("beforeunload", () => {
  if (currentContext) {
    activeOscillators.forEach((osc) => {
      try {
        osc.stop()
        osc.disconnect()
      } catch (e) {
        console.log("Oscillator already stopped")
      }
    })
    activeOscillators.clear()
    currentContext.close()
    currentContext = null
  }
})

// Initialize the page
document.getElementById("uploadButton").addEventListener("click", () => {
  document.getElementById("imageInput").click()
})

// Add these functions to scan.js

let isPlaying = false
let playbackTimeout = null

async function playAllColors() {
  if (isPlaying) return

  try {
    isPlaying = true
    updatePlayStopButtons()

    const context = await initAudioContext()
    const colorGrid = document.getElementById("colorGrid")
    const colorCells = colorGrid.querySelectorAll(".color-cell")
    let currentTime = context.currentTime

    for (const cell of colorCells) {
      if (!isPlaying) break // Check if stopped

      const note = cell.dataset.note
      if (note && note !== "R") {
        // Highlight current cell
        const originalBorder = cell.style.border
        cell.style.border = "2px solid white"

        const frequency = noteToFreq[note]
        const sound = createSoundChain(context, frequency, currentTime, 0.3)
        if (sound) {
          sound.start()
        }

        // Wait for note duration
        await new Promise((resolve) => {
          playbackTimeout = setTimeout(() => {
            cell.style.border = originalBorder
            resolve()
          }, 300)
        })

        currentTime += 0.3
      }
    }
  } catch (error) {
    console.error("Error playing sequence:", error)
  } finally {
    isPlaying = false
    updatePlayStopButtons()
  }
}

function stopPlayback() {
  isPlaying = false
  if (playbackTimeout) {
    clearTimeout(playbackTimeout)
    playbackTimeout = null
  }
  if (currentContext) {
    activeOscillators.forEach((osc) => {
      try {
        osc.stop()
        osc.disconnect()
      } catch (e) {
        console.log("Oscillator already stopped")
      }
    })
    activeOscillators.clear()
  }
  // Reset all cell borders
  const colorCells = document.querySelectorAll(".color-cell")
  colorCells.forEach((cell) => {
    cell.style.border = "none"
  })
  updatePlayStopButtons()
}

function updatePlayStopButtons() {
  const playButton = document.getElementById("playSequenceButton")
  const stopButton = document.getElementById("stopSequenceButton")

  if (playButton) {
    playButton.disabled = isPlaying
    playButton.style.opacity = isPlaying ? "0.5" : "1"
  }
  if (stopButton) {
    stopButton.disabled = !isPlaying
    stopButton.style.opacity = !isPlaying ? "0.5" : "1"
  }
}

// Add this near the end of your updateColorGrid function
function updateColorGrid(colors) {
  const colorGrid = document.getElementById("colorGrid")
  colorGrid.innerHTML = ""

  // Create a container for buttons and color grid
  const container = document.createElement("div")
  container.style.display = "flex"
  container.style.flexDirection = "column"
  container.style.gap = "1rem"

  // Create play controls
  const controls = document.createElement("div")
  controls.style.display = "flex"
  controls.style.gap = "0.5rem"
  controls.style.justifyContent = "center"

  const playButton = document.createElement("button")
  playButton.id = "playSequenceButton"
  playButton.innerHTML = "▶ Play Sequence"
  playButton.onclick = playAllColors
  playButton.style.cssText = `
        padding: 8px 16px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    `

  const stopButton = document.createElement("button")
  stopButton.id = "stopSequenceButton"
  stopButton.innerHTML = "■ Stop"
  stopButton.onclick = stopPlayback
  stopButton.style.cssText = `
        padding: 8px 16px;
        background-color: #f44336;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        opacity: 0.5;
    `
  stopButton.disabled = true

  controls.appendChild(playButton)
  controls.appendChild(stopButton)

  // Create grid container
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
    cell.style.width = "48px"
    cell.style.height = "48px"
    cell.dataset.note = note

    cell.addEventListener("click", () => {
      playNote(note)
    })

    gridContainer.appendChild(cell)
  })

  container.appendChild(controls)
  container.appendChild(gridContainer)
  colorGrid.appendChild(container)
}
