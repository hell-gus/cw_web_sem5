# cw_web_sem5

клик с получ коорд
this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      console.log('CLICK AT:', x, y)
    })