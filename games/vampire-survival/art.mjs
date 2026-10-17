// 뱀서 — 직접 그린 오리지널 캐릭터·적·아이템 그림 (SVG 문자열).
// 원작 그림을 쓰지 않는다. 각 함수는 sprite-gen 과 같은 모양 {svgString, dimension, imageType} 을 돌려준다.
// 크기는 기존 원형 스프라이트 지름과 비슷하게 맞춰서 충돌 판정·엔티티 크기와 어긋나지 않게 했다.

function svg(width, height, body) {
    return {
        svgString:
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ` +
            `width="${width}" height="${height}">${body}</svg>`,
        dimension: { width, height },
        imageType: 'svg',
    };
}

// 플레이어 — 파란 방패 기사 (붉은 망토)
export function knight() {
    return svg(24, 24,
        '<path d="M4 14 L1 22 L8 19 Z" fill="#b91c1c"/>' +
        '<circle cx="12" cy="12" r="9" fill="#38bdf8" stroke="#0c4a6e" stroke-width="1.5"/>' +
        '<path d="M6 11 Q12 6 18 11 L18 13 Q12 16 6 13 Z" fill="#334155"/>' +
        '<circle cx="10" cy="11" r="1.2" fill="#ffffff"/><circle cx="14" cy="11" r="1.2" fill="#ffffff"/>');
}

// 적 1 — 초록 슬라임
export function slime() {
    return svg(20, 18,
        '<path d="M2 16 Q2 4 10 3 Q18 4 18 16 Z" fill="#84cc16" stroke="#3f6212" stroke-width="1"/>' +
        '<ellipse cx="7" cy="6" rx="2" ry="1" fill="#d9f99d"/>' +
        '<circle cx="7.5" cy="10" r="2" fill="#ffffff"/><circle cx="12.5" cy="10" r="2" fill="#ffffff"/>' +
        '<circle cx="7.5" cy="10.3" r="1" fill="#111827"/><circle cx="12.5" cy="10.3" r="1" fill="#111827"/>');
}

// 적 2 — 그림자 까마귀 (보라 날개)
export function crow() {
    return svg(18, 14,
        '<path d="M9 7 L1 3 L4 8 L0 12 L6 11 L9 14 L12 11 L18 12 L14 8 L17 3 Z" ' +
        'fill="#312e81" stroke="#0f0a2a" stroke-width="0.8"/>' +
        '<circle cx="7" cy="7" r="1.2" fill="#f87171"/><circle cx="11" cy="7" r="1.2" fill="#f87171"/>');
}

// 적 3 — 돌 골렘 (회색 암석, 노란 눈)
export function stoneGolem() {
    return svg(30, 30,
        '<rect x="3" y="4" width="24" height="24" rx="5" fill="#78716c" stroke="#292524" stroke-width="1.5"/>' +
        '<path d="M8 10 L12 14 L10 18" stroke="#44403c" stroke-width="1.2" fill="none"/>' +
        '<path d="M20 9 L17 15 L21 19" stroke="#44403c" stroke-width="1.2" fill="none"/>' +
        '<circle cx="11" cy="12" r="2" fill="#fde047"/><circle cx="19" cy="12" r="2" fill="#fde047"/>');
}

// 보스 — 외눈 괴수 (보라 마름모 몸, 붉은 동공)
export function eyeBoss() {
    return svg(64, 64,
        '<path d="M32 4 L58 20 L58 44 L32 60 L6 44 L6 20 Z" fill="#7e22ce" stroke="#2e1065" stroke-width="2"/>' +
        '<circle cx="32" cy="30" r="12" fill="#fef9c3" stroke="#422006" stroke-width="2"/>' +
        '<circle cx="32" cy="30" r="5" fill="#b91c1c"/>' +
        '<path d="M12 50 L8 60 M52 50 L56 60" stroke="#2e1065" stroke-width="3"/>');
}

// 보스 탄 — 가시 달린 분홍 구슬
export function spikeBall() {
    return svg(14, 14,
        '<circle cx="7" cy="7" r="4.5" fill="#fb7185"/>' +
        '<path d="M7 0 L8 3 L7 14 L6 3 Z M0 7 L3 6 L14 7 L3 8 Z" fill="#fda4af"/>');
}

// 지팡이 탄 — 청록 마법 구슬
export function magicOrb() {
    return svg(12, 12,
        '<circle cx="6" cy="6" r="5" fill="#67e8f9" fill-opacity="0.5"/>' +
        '<circle cx="6" cy="6" r="3" fill="#22d3ee"/>' +
        '<circle cx="5" cy="5" r="1" fill="#ffffff"/>');
}

// 경험치 젬 — 청록 수정
export function crystal() {
    return svg(16, 16,
        '<path d="M8 1 L14 7 L8 15 L2 7 Z" fill="#22d3ee" stroke="#0e7490" stroke-width="0.8"/>' +
        '<path d="M8 1 L2 7 L8 7 Z" fill="#a5f3fc"/>');
}

// 보물상자 — 금장 나무 상자
export function treasureChest() {
    return svg(34, 34,
        '<rect x="3" y="10" width="28" height="20" rx="3" fill="#a16207" stroke="#422006" stroke-width="2"/>' +
        '<rect x="3" y="16" width="28" height="3" fill="#facc15"/>' +
        '<rect x="15" y="14" width="4" height="7" fill="#fde047" stroke="#713f12" stroke-width="1"/>');
}

// 오라 — 반투명 주황 원 (점선 테두리)
export function auraRing() {
    return svg(70, 70,
        '<circle cx="35" cy="35" r="34" fill="#fb923c" fill-opacity="0.22" stroke="#fb923c" ' +
        'stroke-width="2" stroke-dasharray="4 3"/>');
}
