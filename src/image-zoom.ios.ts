import { Stretch } from '@nativescript/core/ui/image';
import { Utils, ImageSource, path, knownFolders } from '@nativescript/core';
import {
    ImageZoomBase,
    maxZoomScaleProperty,
    minZoomScaleProperty,
    srcProperty,
    stretchProperty,
    zoomScaleProperty
} from './image-zoom.common';
export class ImageZoom extends ImageZoomBase {
    _image: any;
    private delegate: any;
    private get scrollView() { return this.nativeView as UIScrollView; }

    constructor() {
        super();
    }

    public createNativeView() {
        this._image = UIImageView.new();
        this._image.clipsToBounds = true;
        this._image.contentMode = UIViewContentMode.ScaleAspectFit;
        const nativeView = UIScrollView.new();
        nativeView.addSubview(this._image);
        return nativeView;
    }

    public disposeNativeView() {
        this.delegate = null;
    }

    public onLayout(left: number, top: number, right: number, bottom: number): void {
        super.onLayout(left, top, right, bottom);
        this.setMinScale(this.minZoom);
        this.setMaxScale(this.maxZoom);
        this.setScale(this.zoomScale);
        this.refreshContentSize();
    }

    public onMeasure(widthMeasureSpec: number, heightMeasureSpec: number) {
        const nativeView = this.nativeView;
        if (nativeView) {
            const width = Utils.layout.getMeasureSpecSize(widthMeasureSpec);
            const height = Utils.layout.getMeasureSpecSize(heightMeasureSpec);
            this.setMeasuredDimension(width, height);
        }
    }

    public initNativeView() {
        this.delegate = UIScrollViewDelegateImpl.initWithOwner(
            new WeakRef<ImageZoom>(this)
        );
        this.nativeView.delegate = this.delegate;
    }

    refreshContentSize() {
        const scrollView = this.nativeView as UIScrollView;
        const scaledSize = {
          width: this._image.image.size.width * scrollView.zoomScale,
          height: this._image.image.size.height * scrollView.zoomScale,
        };
        const width = scrollView.bounds.size.width > scaledSize.width
          ? scrollView.bounds.size.width
          : scaledSize.width;
        const height = scrollView.bounds.size.height > scaledSize.height
          ? scrollView.bounds.size.height
          : scaledSize.height;
        this._image.frame = CGRectMake(0, 0, width, height);
        scrollView.contentSize = CGSizeMake(width, height);
    }

    private calcInitScale() {
        const image = this._image.image;
        const wRatio = image.size.width / this.scrollView.bounds.size.width;
        const hRatio = image.size.height / this.scrollView.bounds.size.height;
        return wRatio > hRatio
            ? this.scrollView.bounds.size.width / image.size.width
            : this.scrollView.bounds.size.height / image.size.height;
    }

    private setMinScale(scale: number) {
        this.scrollView.minimumZoomScale = this.calcInitScale() * scale;
    }

    private setMaxScale(scale: number) {
        this.scrollView.maximumZoomScale = this.calcInitScale() * scale;
    }

    private setScale(scale: number) {
        this.scrollView.zoomScale = this.calcInitScale() * scale;
    }

    [stretchProperty.setNative](value: 'none' | 'aspectFill' | 'aspectFit' | 'fill') {
        switch (value) {
            case 'aspectFit':
                this.nativeViewProtected.contentMode = UIViewContentMode.ScaleAspectFit;
                break;

            case 'aspectFill':
                this.nativeViewProtected.contentMode = UIViewContentMode.ScaleAspectFill;
                break;

            case 'fill':
                this.nativeViewProtected.contentMode = UIViewContentMode.ScaleToFill;
                break;

            case 'none':
            default:
                this.nativeViewProtected.contentMode = UIViewContentMode.TopLeft;
                break;
        }
    }


    [srcProperty.setNative](src: any) {
        if (typeof src === 'string' && src.startsWith('res://')) {
            this._image.image = UIImage.imageNamed(src.replace('res://', ''));
        } else if (typeof src === 'object') {
            this._image.image = src.ios;
        } else if (typeof src === 'string' && src.startsWith('http')) {
            ImageSource.fromUrl(src).then(source => {
                this._image.image = source.ios;
            });
        } else if (typeof src === 'string' && src.startsWith('~')) {
            this._image.image = UIImage.imageWithContentsOfFile(path.join(knownFolders.currentApp().path, src.replace('~', '')));

        } else {
            this._image.image = UIImage.imageWithContentsOfFile(src);
        }
    }

    [stretchProperty.setNative](stretch: Stretch) {
        this._image.stretch = stretch;
    }

    [zoomScaleProperty.setNative](scale: number) {
        if (this.nativeView) {
            this.nativeView.zoomScale = scale;
        }
    }

    [minZoomScaleProperty.setNative](scale: number) {
        if (this.nativeView) {
            this.nativeView.minimumZoomScale = scale;
        }
    }

    [maxZoomScaleProperty.setNative](scale: number) {
        if (this.nativeView) {
            this.nativeView.maximumZoomScale = scale;
        }
    }
}

@NativeClass()
export class UIScrollViewDelegateImpl extends NSObject
    implements UIScrollViewDelegate {
    private owner: WeakRef<ImageZoom>;
    public static ObjCProtocols = [UIScrollViewDelegate];

    public static initWithOwner(
        owner: WeakRef<ImageZoom>
    ): UIScrollViewDelegateImpl {
        const delegate = new UIScrollViewDelegateImpl();
        delegate.owner = owner;
        return delegate;
    }

    viewForZoomingInScrollView(scrollView: UIScrollView) {
        const owner = this.owner.get();
        return owner._image;
    }

    scrollViewDidZoom?(scrollView: UIScrollView) {
        this.owner.get().refreshContentSize();
    }
}
