// Input Handling System
export class InputSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.mouseX = 0;
        this.mouseY = 0;
        this.clicks = [];
        this.keys = {};
        this.cursorVisible = true;

        this._onMouseMove = this._onMouseMove.bind(this);
        this._onClick = this._onClick.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onContextMenu = this._onContextMenu.bind(this);

        this.canvas.addEventListener('mousemove', this._onMouseMove);
        this.canvas.addEventListener('click', this._onClick);
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        this.canvas.addEventListener('contextmenu', this._onContextMenu);
    }

    _getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    _onMouseMove(e) {
        const coords = this._getCanvasCoords(e);
        this.mouseX = coords.x;
        this.mouseY = coords.y;
    }

    _onClick(e) {
        const coords = this._getCanvasCoords(e);
        this.clicks.push({ x: coords.x, y: coords.y, time: performance.now() });
    }

    _onKeyDown(e) {
        this.keys[e.code] = true;
    }

    _onKeyUp(e) {
        this.keys[e.code] = false;
    }

    _onContextMenu(e) {
        e.preventDefault();
    }

    getClicks() {
        const clicks = this.clicks.slice();
        this.clicks.length = 0;
        return clicks;
    }

    isKeyPressed(code) {
        return !!this.keys[code];
    }

    consumeKey(code) {
        if (this.keys[code]) {
            this.keys[code] = false;
            return true;
        }
        return false;
    }

    setCrosshairCursor() {
        this.canvas.style.cursor = 'crosshair';
    }

    setDefaultCursor() {
        this.canvas.style.cursor = 'default';
    }

    hideCursor() {
        this.canvas.style.cursor = 'none';
        this.cursorVisible = false;
    }

    showCursor() {
        this.canvas.style.cursor = 'crosshair';
        this.cursorVisible = true;
    }

    // Render custom crosshair
    renderCrosshair(ctx) {
        const x = this.mouseX;
        const y = this.mouseY;
        const size = 18;

        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = '#FF3333';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#FF0000';
        ctx.shadowBlur = 8;

        // Outer circle
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.stroke();

        // Cross lines
        ctx.beginPath();
        ctx.moveTo(0, -size - 6);
        ctx.lineTo(0, -size * 0.4);
        ctx.moveTo(0, size * 0.4);
        ctx.lineTo(0, size + 6);
        ctx.moveTo(-size - 6, 0);
        ctx.lineTo(-size * 0.4, 0);
        ctx.moveTo(size * 0.4, 0);
        ctx.lineTo(size + 6, 0);
        ctx.stroke();

        // Center dot
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FF3333';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    destroy() {
        this.canvas.removeEventListener('mousemove', this._onMouseMove);
        this.canvas.removeEventListener('click', this._onClick);
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        this.canvas.removeEventListener('contextmenu', this._onContextMenu);
    }
}
