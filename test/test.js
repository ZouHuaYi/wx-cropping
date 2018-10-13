import WeCropper from '../cropper/cropper.js'

const device = wx.getSystemInfoSync() // 获取设备信息
const width = device.windowWidth // 示例为一个与屏幕等宽的正方形裁剪框
const height = width
const devicePixelRatio = device.pixelRatio
const app = getApp()


Page({
		data: {
			imgSrc:'',
			cropperOpt: {
				id: 'cropper',
				width,  // 画布宽度
				height, // 画布高度
				cwidth:devicePixelRatio*width,
				cheight:devicePixelRatio*height,
				scale: 2.5, // 最大缩放倍数
				zoom: 8, // 缩放系数
				cut: {
					x: (width - 200) / 2, // 裁剪框x轴起点
					y: (width - 200) / 2, // 裁剪框y轴期起点
					width: 200, // 裁剪框宽度
					height: 200 // 裁剪框高度
				}
			}
		},
		onLoad (option) {
			const { cropperOpt } = this.data;
			// 若同一个页面只有一个裁剪容器，在其它Page方法中可通过this.wecropper访问实例
			this.wecropper =  new WeCropper(cropperOpt)
				.on('ready', (ctx) => {
						console.log(`wecropper is ready for work!`)
				})
				.on('beforeImageLoad', (ctx) => {
						console.log(`before picture loaded, i can do something`)
						console.log(`current canvas context: ${ctx}`)
						wx.showToast({
								title: '上传中',
								icon: 'loading',
								duration: 20000
						})
				})
				.on('imageLoad', (ctx) => {
						console.log(`picture loaded`)
						console.log(`current canvas context: ${ctx}`)
						wx.hideToast()
				})   	
    },
		touchStart (e) {
			this.wecropper.touchStart({
				touches:e.touches.filter(i=> i.x !== undefined)
			})
		},
		touchMove (e) {
			this.wecropper.touchMove({
				touches:e.touches.filter(i=> i.x !== undefined)
			})
		},
		touchEnd (e) {
			this.wecropper.touchEnd()
		},
		uploadTap () {
			const _this = this;
			wx.chooseImage({
				count: 1, // 默认9
				sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
				sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
				success (res) {
					const src = res.tempFilePaths[0]
					_this.wecropper.pushOrign(src)
					_this.setData({
						imgSrc:src
					})
				}
			})
		},
		getCropperImage () {
				const _this = this;
				// 点击了裁剪按钮
				if(!_this.data.imgSrc) return;
				// this.wecropper.getCropperImage((src) => {if (src) {}})    // 这是默认的方法
				let { imgLeft, imgTop, scaleWidth, scaleHeight } = this.wecropper // 获取图片在原画布坐标位置及宽高
				let { x, y, width, height } = this.wecropper.cut // 获取裁剪框位置及大小
				// 所有参数乘设备像素比
				imgLeft = imgLeft * devicePixelRatio
				imgTop = imgTop * devicePixelRatio
				scaleWidth = scaleWidth * devicePixelRatio
				scaleHeight = scaleHeight * devicePixelRatio
				x = x * devicePixelRatio
				y = y * devicePixelRatio
				width = width * devicePixelRatio
				height = height * devicePixelRatio
				
				const targetCtx = wx.createCanvasContext('target') // 这里是目标canvas画布的id值
				
				targetCtx.drawImage(_this.data.imgSrc,imgLeft,imgTop, scaleWidth, scaleHeight)
				
				targetCtx.draw(true,()=>{
					wx.canvasToTempFilePath({
						canvasId: 'target',
						x,
						y,
						width,
						height,
						fileType:'jpg',
						success (res) {
							// return;
							const tmpPath = res.tempFilePath;
							console.log(tmpPath)
							// 输出后清除clear 画布
							targetCtx.clearRect(imgLeft, imgLeft, scaleWidth, scaleHeight);
							targetCtx.draw();
							
							wx.previewImage({
								current: '', 
								urls: [tmpPath] 
							})
							return;
							// 图片上传
								wx.uploadFile({
									url: app.globalData.baseUrl+'?r=mpupload', 
									filePath: tmpPath,
									name: 'image',
									header: {
										'token': app.globalData.token,
										'content-type': 'multipart/form-data'
									},
									success: function (res) {
										var data = JSON.parse(res.data);
										if(data.code==1){
											if (app.globalData[_this.type] instanceof Array){
												app.globalData[_this.type].push(data.data)
											}else{
												app.globalData[_this.type] = data.data;
											}
											wx.hideLoading();
											wx.navigateBack({});
										}else{
											wx.hideLoading();
											wx.showToast({
												title: '图片上传失败了，请检查图片是否过大。',
												icon: 'none',
												duration: 2000
											})
										}
									},
									fail: function (err) {
										wx.hideLoading();
									}
								})
						}
					})
				})
		}
})

