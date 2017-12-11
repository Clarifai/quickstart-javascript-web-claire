const video = document.getElementById('video')
const canvas = document.getElementById('canvas')
const concepts = document.getElementById('concepts')

const ctx = canvas.getContext('2d')

const app = new Clarifai.App({
  apiKey: 'YOUR_CLARIFAI_API_KEY'
})

window.navigator.mediaDevices
  .getUserMedia({
    video: { width: canvas.width, height: canvas.height },
    audio: false
  })
  .then(stream => {
    video.onloadeddata = () => window.requestAnimationFrame(tick)
    video.src = window.URL.createObjectURL(stream)
  })
  .catch(err => console.error(err))

let requestInProgress = false

function tick() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  if (!requestInProgress) {
    requestInProgress = true

    const base64 = canvas
      .toDataURL('image/jpeg')
      .split('data:image/jpeg;base64,')[1]

    app.models
      .predict(Clarifai.GENERAL_MODEL, { base64 })
      .then(res => {
        concepts.innerHTML = ''

        console.log(res)

        res.outputs[0].data.concepts.forEach(concept => {
          const li = document.createElement('li')
          li.innerText = `${concept.name}: ${concept.value}`
          concepts.appendChild(li)
        })

        setTimeout(() => (requestInProgress = false), 2000)
      })
      .catch(err => console.error(err))
  }

  window.requestAnimationFrame(tick)
}
