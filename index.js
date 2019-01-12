const app = new Clarifai.App({
  apiKey: 'YOUR_CLARIFAI_API_KEY'
})

const PAINT = {
  fontSize: 28,
  black: '#000000',
  white: '#fefefe'
}

const video = document.getElementById('video')
const canvas = document.getElementById('canvas')
const background = document.getElementById('background')

canvas.width = window.innerWidth
canvas.height = window.innerHeight

background.width = window.innerWidth
background.height = window.innerHeight

const ctx = canvas.getContext('2d')
ctx.font = `${PAINT.fontSize}pt Helvetica`

const backgroundCtx = background.getContext('2d')

let lastTick
let fps
let delta

let requestInProgress = false

class Concept {
  constructor(ctx, name) {
    this.ctx = ctx
    this.name = name
    this.textWidth = this.ctx.measureText(this.name).width
    this.x = 20
    this.y = canvas.height + PAINT.fontSize * 2
  }

  /**
   * https://stackoverflow.com/a/3368118/959953
   * Draws a rounded rectangle using the current state of the canvas.
   * If you omit the last three params, it will draw a rectangle
   * outline with a 5 pixel border radius
   * @param {CanvasRenderingContext2D} ctx
   * @param {Number} x The top left x coordinate
   * @param {Number} y The top left y coordinate
   * @param {Number} width The width of the rectangle
   * @param {Number} height The height of the rectangle
   * @param {Number} [radius = 5] The corner radius; It can also be an object
   *                 to specify different radii for corners
   * @param {Number} [radius.tl = 0] Top left
   * @param {Number} [radius.tr = 0] Top right
   * @param {Number} [radius.br = 0] Bottom right
   * @param {Number} [radius.bl = 0] Bottom left
   * @param {Boolean} [fill = false] Whether to fill the rectangle.
   * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
   */
  roundRect(x, y, width, height, radius, fill, stroke) {
    if (typeof stroke == 'undefined') {
      stroke = true
    }
    if (typeof radius === 'undefined') {
      radius = 5
    }
    if (typeof radius === 'number') {
      radius = { tl: radius, tr: radius, br: radius, bl: radius }
    } else {
      var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 }
      for (var side in defaultRadius) {
        radius[side] = radius[side] || defaultRadius[side]
      }
    }
    this.ctx.beginPath()
    this.ctx.moveTo(x + radius.tl, y)
    this.ctx.lineTo(x + width - radius.tr, y)
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr)
    this.ctx.lineTo(x + width, y + height - radius.br)
    this.ctx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius.br,
      y + height
    )
    this.ctx.lineTo(x + radius.bl, y + height)
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl)
    this.ctx.lineTo(x, y + radius.tl)
    this.ctx.quadraticCurveTo(x, y, x + radius.tl, y)
    this.ctx.closePath()
    if (fill) {
      this.ctx.fill()
    }
    if (stroke) {
      this.ctx.stroke()
    }
  }

  update(dt) {
    const index = concepts.indexOf(this)

    const previousConcept = concepts[index - 1]

    if (previousConcept) {
      if (this.y - previousConcept.y > 70) {
        this.y -= 150 * dt
      }
    } else {
      this.y -= 150 * dt
    }
  }

  draw() {
    const oldX = this.x
    const oldY = this.y

    this.ctx.fillStyle = PAINT.white

    this.roundRect(oldX - 10, oldY, this.textWidth + 20, 50, 5, PAINT.white)

    this.ctx.fillStyle = PAINT.black

    this.ctx.fillText(
      this.name,
      oldX + this.textWidth / 2 - this.textWidth / 2,
      oldY + 70 / 2
    )
  }
}

const man = new Concept(ctx, 'man')

let concepts = []

function tick(now) {
  if (!lastTick) {
    lastTick = now
  } else {
    dt = Math.min(1, (now - lastTick) / 1000)

    lastTick = now

    // fps = 1 / dt

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    backgroundCtx.drawImage(video, 0, 0, canvas.width, canvas.height)

    concepts.forEach(concept => concept.update(dt))

    concepts = concepts.filter(concept => concept.y >= 0)

    concepts.forEach(concept => concept.draw())

    if (!requestInProgress) {
      requestInProgress = true

      const base64 = background
        .toDataURL('image/jpeg')
        .split('data:image/jpeg;base64,')[1]

      app.models
        .predict(Clarifai.GENERAL_MODEL, { base64 })
        .then(res => {
          concepts = concepts.concat(
            res.outputs[0].data.concepts
              .filter(concept => {
                if (concept.value < 0.8) {
                  return false
                }

                return !concepts.find(
                  otherConcept => concept.name === otherConcept.name
                )
              })
              .map(concept => new Concept(ctx, concept.name))
          )

          // console.log(concepts)

          setTimeout(() => (requestInProgress = false), 2000)
        })
        .catch(err => console.error(err))
    }
  }

  window.requestAnimationFrame(tick)
}

// Use this to find different webcams
// navigator.mediaDevices.enumerateDevices().then(devices => console.log(devices))

navigator.getUserMedia(
  // Front facing camera
  // { video: { facingMode: { exact: 'environment' } } },
  { video: { width: 1440, height: 900 } },
  stream => {
    video.addEventListener(
      'loadeddata',
      () => {
        window.requestAnimationFrame(tick)
      },
      false
    )

    video.srcObject = stream

    video.play()
  },
  err => {
    console.error(err)
  }
)
