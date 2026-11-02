// Koe Recording Overlay
//
// Listens to the koe daemon's D-Bus signals (com.github.koe.Daemon) and shows
// a small overlay at the top of the screen while recording / processing /
// typing. The overlay lives in the Shell's own UI layer and is not reactive,
// so it never takes keyboard focus from the window koe types into.

import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const BUS_NAME = 'com.github.koe.Daemon';
const OBJECT_PATH = '/com/github/koe/Daemon';
const INTERFACE = 'com.github.koe.Daemon';

// Keep in sync with src/ui/indicator.rs.
const DOT_COUNT = 5;
const DOT_BASE_RADIUS = 4;
const DOT_MAX_RADIUS = 12;
const DOT_SPACING = 24;
const AREA_WIDTH = 168;
const AREA_HEIGHT = 30;
const FRAME_MS = 33;
const FADEOUT_DELAY_MS = 2000;
const FADEOUT_DURATION_MS = 600;
const TOP_MARGIN = 12;

const LABELS = {
    Recording: 'Recording...',
    Processing: 'Processing...',
    Typing: 'Typing...',
    Idle: 'Done',
};

function dotRadius(index, phase, level) {
    const wave = Math.abs(Math.sin((phase + index * 0.8) * 2));
    return DOT_BASE_RADIUS + (DOT_MAX_RADIUS - DOT_BASE_RADIUS) * wave * level;
}

function dotColor(index) {
    const hue = 0.5 + index * 0.05;
    return [0.2, 0.6 + hue * 0.3, 1.0];
}

class KoeOverlay {
    constructor() {
        this._state = 'Idle';
        this._level = 0;
        this._phase = 0;
        this._frameId = 0;
        this._fadeDelayId = 0;

        this.actor = new St.BoxLayout({
            style_class: 'koe-overlay',
            orientation: Clutter.Orientation.VERTICAL,
            reactive: false,
            can_focus: false,
            track_hover: false,
            visible: false,
            opacity: 0,
        });

        this._label = new St.Label({
            style_class: 'koe-overlay-label',
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.actor.add_child(this._label);

        this._area = new St.DrawingArea({
            width: AREA_WIDTH,
            height: AREA_HEIGHT,
            reactive: false,
        });
        this._area.connect('repaint', area => this._repaint(area));
        this.actor.add_child(this._area);

        Main.uiGroup.add_child(this.actor);
    }

    setState(state) {
        this._state = state;
        const text = LABELS[state];
        if (text === undefined)
            return;
        this._label.text = text;

        if (state === 'Idle') {
            this._level = 0;
            this._scheduleFadeout();
        } else {
            this._show();
        }
    }

    setLevel(level) {
        this._level = Math.min(Math.max(level, 0), 1);
    }

    hideNow() {
        this._clearFadeDelay();
        this._stopFrames();
        this.actor.remove_all_transitions();
        this.actor.opacity = 0;
        this.actor.hide();
    }

    destroy() {
        this.hideNow();
        this.actor.destroy();
        this.actor = null;
    }

    _show() {
        this._clearFadeDelay();
        this.actor.remove_all_transitions();
        this._reposition();
        this.actor.show();
        this.actor.opacity = 255;
        Main.uiGroup.set_child_above_sibling(this.actor, null);
        this._startFrames();
    }

    _reposition() {
        const monitor = Main.layoutManager.currentMonitor ?? Main.layoutManager.primaryMonitor;
        if (!monitor)
            return;
        const [, natWidth] = this.actor.get_preferred_width(-1);
        const panelHeight = Main.panel?.height ?? 0;
        const x = monitor.x + Math.floor((monitor.width - natWidth) / 2);
        const y = monitor.y + panelHeight + TOP_MARGIN;
        this.actor.set_position(x, y);
    }

    _scheduleFadeout() {
        if (!this.actor.visible)
            return;
        this._clearFadeDelay();
        this._fadeDelayId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, FADEOUT_DELAY_MS, () => {
            this._fadeDelayId = 0;
            this.actor.ease({
                opacity: 0,
                duration: FADEOUT_DURATION_MS,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => {
                    if (this._state === 'Idle')
                        this.hideNow();
                },
            });
            return GLib.SOURCE_REMOVE;
        });
    }

    _clearFadeDelay() {
        if (this._fadeDelayId) {
            GLib.source_remove(this._fadeDelayId);
            this._fadeDelayId = 0;
        }
    }

    _startFrames() {
        if (this._frameId)
            return;
        this._frameId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, FRAME_MS, () => {
            this._phase = (this._phase + 0.1) % (Math.PI * 20);
            this._area.queue_repaint();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _stopFrames() {
        if (this._frameId) {
            GLib.source_remove(this._frameId);
            this._frameId = 0;
        }
    }

    _repaint(area) {
        const cr = area.get_context();
        const [width, height] = area.get_surface_size();
        const startX = width / 2 - ((DOT_COUNT - 1) * DOT_SPACING) / 2;
        const y = height / 2;
        for (let i = 0; i < DOT_COUNT; i++) {
            const [r, g, b] = dotColor(i);
            cr.setSourceRGBA(r, g, b, 1);
            cr.arc(startX + i * DOT_SPACING, y, dotRadius(i, this._phase, this._level), 0, 2 * Math.PI);
            cr.fill();
        }
        cr.$dispose();
    }
}

export default class KoeOverlayExtension extends Extension {
    enable() {
        this._overlay = new KoeOverlay();
        const bus = Gio.DBus.session;

        this._signalId = bus.signal_subscribe(
            BUS_NAME, INTERFACE, null, OBJECT_PATH, null,
            Gio.DBusSignalFlags.NONE,
            (_conn, _sender, _path, _iface, signal, params) => {
                if (signal === 'StateChanged') {
                    const [state] = params.deepUnpack();
                    this._overlay.setState(state);
                } else if (signal === 'AudioLevel') {
                    const [level] = params.deepUnpack();
                    this._overlay.setLevel(level);
                }
            });

        // Hide the overlay if the daemon exits mid-recording.
        this._watchId = Gio.bus_watch_name(
            Gio.BusType.SESSION, BUS_NAME, Gio.BusNameWatcherFlags.NONE,
            null, () => this._overlay?.hideNow());
    }

    disable() {
        if (this._signalId) {
            Gio.DBus.session.signal_unsubscribe(this._signalId);
            this._signalId = 0;
        }
        if (this._watchId) {
            Gio.bus_unwatch_name(this._watchId);
            this._watchId = 0;
        }
        this._overlay?.destroy();
        this._overlay = null;
    }
}
