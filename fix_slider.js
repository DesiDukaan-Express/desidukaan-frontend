const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/apps/delivery/ActiveDeliveryScreen.js');
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// ─────────────────────────────────────────────────────────────────
// 1. Replace lines 58-162 (old SlideButton + constants) with new version
// ─────────────────────────────────────────────────────────────────

// Find the line range to replace
// Line 58 starts the THUMB/TRACK_W/DRAG_RANGE constants
// Line 162 ends the sb StyleSheet

// Let's find exact boundaries by content
let startLine = -1, endLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (startLine === -1 && lines[i].includes('const THUMB') && lines[i].includes('56')) {
    startLine = i;
  }
  if (lines[i].includes('thumbIcon:') && lines[i].includes('color: C.white')) {
    endLine = i;
  }
}

// Also find the closing }); of sb StyleSheet
for (let i = endLine; i < Math.min(endLine + 5, lines.length); i++) {
  if (lines[i].trim() === '});') {
    endLine = i;
    break;
  }
}

console.log(`Replacing lines ${startLine + 1} to ${endLine + 1}`);

const newSlideButton = `const THUMB = 56;

function SlideButton({ label, onComplete, color = C.primary, onDragStart, onDragEnd }) {
  const pan             = useRef(new Animated.Value(0)).current;
  const [done, setDone] = useState(false);
  const isDragging      = useRef(false);
  const dragRange       = useRef(0);   // computed on layout
  const trackRef        = useRef(null);

  // Reset when the step label changes
  useEffect(() => { setDone(false); pan.setValue(0); }, [label]);

  // Measure the track once it's laid out (or on resize)
  const onLayout = (e) => {
    const w = e.nativeEvent.layout.width;
    dragRange.current = Math.max(w - THUMB - 4, 0);
  };

  // ── Native touch (mobile) ──────────────────────────────────────────
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => !done,
      onStartShouldSetPanResponderCapture: () => !done,
      onMoveShouldSetPanResponder:         (_, g) => !done && Math.abs(g.dx) > 2,
      onMoveShouldSetPanResponderCapture:  (_, g) => !done && Math.abs(g.dx) > 2,
      onPanResponderGrant:   ()     => { isDragging.current = true; onDragStart?.(); },
      onPanResponderMove:    (_, g) => {
        pan.setValue(Math.max(0, Math.min(g.dx, dragRange.current)));
      },
      onPanResponderRelease: (_, g) => {
        isDragging.current = false; onDragEnd?.();
        if (g.dx >= dragRange.current * 0.80) {
          Animated.spring(pan, { toValue: dragRange.current, useNativeDriver: false })
            .start(() => { setDone(true); onComplete?.(); });
        } else {
          Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
        }
      },
      onPanResponderTerminate: () => {
        isDragging.current = false; onDragEnd?.();
        Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
      },
    })
  ).current;

  const labelOpacity = pan.interpolate({
    inputRange:  [0, 80],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // ── Web / PC mouse support ─────────────────────────────────────────
  const startXRef = useRef(null);

  const webMouseDown = (e) => {
    if (done) return;
    e.preventDefault();
    // Element-relative start position so it works at any scroll/window size
    const rect = e.currentTarget.closest('[data-slidetrack]')?.getBoundingClientRect?.()
      || e.currentTarget.parentElement?.getBoundingClientRect?.();
    startXRef.current = rect ? e.clientX - rect.left - THUMB / 2 : 0;
    isDragging.current = true;
    onDragStart?.();

    const onMove = (mv) => {
      if (!isDragging.current) return;
      const r = trackRef.current?.getBoundingClientRect?.();
      const x = r ? mv.clientX - r.left - THUMB / 2 : mv.clientX - startXRef.current;
      pan.setValue(Math.max(0, Math.min(x, dragRange.current)));
    };
    const onUp = (mu) => {
      isDragging.current = false; onDragEnd?.();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      const r = trackRef.current?.getBoundingClientRect?.();
      const x = r ? mu.clientX - r.left - THUMB / 2 : 0;
      if (x >= dragRange.current * 0.80) {
        Animated.spring(pan, { toValue: dragRange.current, useNativeDriver: false })
          .start(() => { setDone(true); onComplete?.(); });
      } else {
        Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  };

  const thumbWebProps = Platform.OS === 'web'
    ? { onMouseDown: webMouseDown, style: { cursor: done ? 'default' : 'grab', userSelect: 'none' } }
    : {};

  // ref callback: attach both the track native ref and the web DOM ref
  const setTrackRef = (node) => { if (node) trackRef.current = node; };

  return (
    <View
      ref={setTrackRef}
      onLayout={onLayout}
      data-slidetrack="1"
      style={[sb.track, { backgroundColor: done ? color : C.primaryLight, borderColor: color }]}
    >
      <Animated.View style={[sb.fill, { width: Animated.add(pan, THUMB + 4), backgroundColor: color }]} />
      <Animated.Text style={[sb.label, { opacity: labelOpacity, color: done ? C.white : C.primaryText }]}>
        {done ? 'Done ✓' : label}
      </Animated.Text>
      <Animated.View
        style={[sb.thumb, { transform: [{ translateX: pan }], backgroundColor: color }]}
        {...responder.panHandlers}
        {...thumbWebProps}
      >
        {done
          ? <MaterialIcons name="check"         size={22} color={C.white} />
          : <MaterialIcons name="chevron-right" size={22} color={C.white} />}
      </Animated.View>
    </View>
  );
}

const sb = StyleSheet.create({
  track: {
    // width is NOT fixed — grows to fill the slideWrap container
    alignSelf: 'stretch',
    height: THUMB + 4, borderRadius: (THUMB + 4) / 2,
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, position: 'relative',
  },
  fill:  { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: (THUMB + 4) / 2 },
  label: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3, zIndex: 1 },
  thumb: {
    position: 'absolute', left: 2,
    width: THUMB, height: THUMB, borderRadius: THUMB / 2,
    alignItems: 'center', justifyContent: 'center', elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, zIndex: 2,
  },
});`;

lines.splice(startLine, endLine - startLine + 1, ...newSlideButton.split('\n'));
content = lines.join('\n');
fs.writeFileSync(filePath, content, 'utf8');
console.log('SlideButton rewritten. Lines replaced:', startLine + 1, 'to', endLine + 1);
