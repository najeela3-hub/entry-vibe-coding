// 3D 강체 물리 데모 (_002: 부드러운 버전) — 공 6개가 상자 안에서 중력으로 떨어지며 서로 충돌한다.
// 조작: 마우스 드래그 = 시점(카메라) 회전, R 키 = 다시 시작.
//
// 구성 (모두 원작과 무관한 자체 설계):
//   - 물리: 위치/속도 리스트(bx,by,bz / vx,vy,vz), 매 틱 중력·벽/바닥 반발·공끼리 충돌(동일 질량 충격량).
//   - 3D 투영: 시점 yaw/pitch(도) → 회전 → 원근 투영(F/depth). 공은 복제본이 투영 결과를 읽어 그린다.
//   - 상자: 8개 꼭짓점을 같은 투영으로 그리고 pen 으로 12 모서리를 그린다.
//
// 주의: 엔트리 블록 수가 많아 프레임 속도가 낮을 수 있다. 공 수는 MAX 상수로 조절.

import {
    when, repeat, if_, cmp, calc, getVar, setVar, changeVar, wait,
    locateXY, show, hide, createClone, turnAbs, changeShape, setSize,
    valueAt, setListAt, coord, obj, scene as makeScene,
    startDraw, stopDraw, eraseAll, setColor, setThickness,
    pictureFromGen,
} from '../../tools/lib/spec-dsl.mjs';
import { shadedBall, rect, circle } from '../../tools/lib/sprite-gen.mjs';

// ── 상수 ───────────────────────────────────────────────────────────
const N = 6;            // 공 개수
const H = 120;          // 상자 반폭 (x, z, 바닥 y = -H)
const G = 0.25;         // 중력 (프레임당 속도 감소)
const REST = 0.5;       // 반발 계수 (0.6 → 0.5: 덜 튀게)
const DAMP = 0.996;     // 공기 저항 (프레임당 속도 배율)
const CAM_EASE = 0.12;  // 카메라 회전 따라가기 비율 (프레임당)
const FRIC = 0.985;     // 바닥 마찰 (프레임당 수평 속도 배율)
const CAM_D = 420;      // 카메라 거리
const FOCAL = 380;      // 초점 거리

// 초기값 (리스트 기본값과 같은 값을 쓰고, 시작·리셋 때 다시 넣는다)
const INIT_BX = [-60, 40, -20, 70, -80, 30];
const INIT_BY = [80, 110, 140, 60, 120, 40];
const INIT_BZ = [-40, 30, 60, -70, 10, -10];
const BALL_R  = [14, 18, 12, 22, 16, 20];
const BALL_SHAPE = [1, 2, 3, 1, 2, 3];

// 상자 꼭짓점 8개 (1~4: 바닥, 5~8: 천장)
const CW_X = [-H, H, H, -H, -H, H, H, -H];
const CW_Y = [-H, -H, H, H, -H, -H, H, H];
const CW_Z = [-H, -H, -H, -H, H, H, H, H];
// 모서리 12개 (꼭짓점 번호 쌍)
const EDGES = [[1, 2], [2, 6], [6, 5], [5, 1], [4, 3], [3, 7], [7, 8], [8, 4], [1, 4], [2, 3], [6, 7], [5, 8]];

// ── 블록 헬퍼 ──────────────────────────────────────────────────────
const v = (n) => getVar(n);
const L = (list, idx) => valueAt(list, idx);
const setL = (list, idx, value) => setListAt(list, idx, value);
const add = (a, b) => calc(a, '+', b);
const sub = (a, b) => calc(a, '-', b);
const mul = (a, b) => calc(a, '*', b);
const div = (a, b) => calc(a, '/', b);
const op = (a, f) => ({ type: 'calc_operation', params: [null, a, null, f] });  // 'sin' 'cos' 'root' ...
const sinE = (a) => op(a, 'sin');
const cosE = (a) => op(a, 'cos');
const sqrtE = (a) => op(a, 'root');
const isClicked = () => ({ type: 'is_clicked', params: [null] });
const mouseX = () => ({ type: 'coordinate_mouse', params: [null, 'x', null] });
const mouseY = () => ({ type: 'coordinate_mouse', params: [null, 'y', null] });

// 시작·리셋 때 공 위치와 속도를 초기값으로
function initBlocks() {
    const out = [];
    for (let k = 0; k < N; k++) {
        const idx = k + 1;
        out.push(setL('bx', idx, INIT_BX[k]), setL('by', idx, INIT_BY[k]), setL('bz', idx, INIT_BZ[k]));
        out.push(setL('vx', idx, 0), setL('vy', idx, 0), setL('vz', idx, 0));
    }
    return out;
}

// 공 i 의 중력·이동·벽/바닥 반발 (i 는 변수 'i')
function integrateBlocks() {
    const I = v('i');
    const r = L('br', I);
    return [
        setL('vx', I, mul(L('vx', I), DAMP)),
        setL('vy', I, mul(L('vy', I), DAMP)),
        setL('vz', I, mul(L('vz', I), DAMP)),
        setL('vy', I, sub(L('vy', I), G)),
        setL('bx', I, add(L('bx', I), L('vx', I))),
        setL('by', I, add(L('by', I), L('vy', I))),
        setL('bz', I, add(L('bz', I), L('vz', I))),
        // x 벽
        if_(cmp(L('bx', I), '<', add(-H, r)), [
            setL('bx', I, add(-H, r)), setL('vx', I, mul(L('vx', I), -REST)),
        ]),
        if_(cmp(L('bx', I), '>', sub(H, r)), [
            setL('bx', I, sub(H, r)), setL('vx', I, mul(L('vx', I), -REST)),
        ]),
        // z 벽
        if_(cmp(L('bz', I), '<', add(-H, r)), [
            setL('bz', I, add(-H, r)), setL('vz', I, mul(L('vz', I), -REST)),
        ]),
        if_(cmp(L('bz', I), '>', sub(H, r)), [
            setL('bz', I, sub(H, r)), setL('vz', I, mul(L('vz', I), -REST)),
        ]),
        // 바닥 (마찰 포함)
        if_(cmp(L('by', I), '<', add(-H, r)), [
            setL('by', I, add(-H, r)), setL('vy', I, mul(L('vy', I), -REST)),
            setL('vx', I, mul(L('vx', I), FRIC)), setL('vz', I, mul(L('vz', I), FRIC)),
            if_(cmp(L('vy', I), '<', 0.8), [ setL('vy', I, 0) ]),
        ]),
        // 천장 (상자 위쪽 2H 까지)
        if_(cmp(L('by', I), '>', sub(2 * H, r)), [
            setL('by', I, sub(2 * H, r)), setL('vy', I, mul(L('vy', I), -REST)),
        ]),
    ];
}

// 공 i(변수 'i') 와 공 j(변수 'j') 가 겹치면 밀어내고 충격량 적용 (j > i 일 때만 호출)
function pairBlocks() {
    const I = v('i'), J = v('j');
    return [
        setVar('dx', sub(L('bx', J), L('bx', I))),
        setVar('dy', sub(L('by', J), L('by', I))),
        setVar('dz', sub(L('bz', J), L('bz', I))),
        setVar('dsq', add(add(mul(v('dx'), v('dx')), mul(v('dy'), v('dy'))), mul(v('dz'), v('dz')))),
        setVar('rs', add(L('br', I), L('br', J))),
        if_(cmp(v('dsq'), '<', mul(v('rs'), v('rs'))), [
            setVar('dd', sqrtE(v('dsq'))),
            if_(cmp(v('dd'), '>', 0.01), [
                setVar('nx', div(v('dx'), v('dd'))),
                setVar('ny', div(v('dy'), v('dd'))),
                setVar('nz', div(v('dz'), v('dd'))),
                setVar('ov', sub(v('rs'), v('dd'))),
                setVar('ovh', div(v('ov'), 2)),
                // 겹침 해소: 두 공을 반씩 떼어 놓기
                setL('bx', I, sub(L('bx', I), mul(v('nx'), v('ovh')))),
                setL('bx', J, add(L('bx', J), mul(v('nx'), v('ovh')))),
                setL('by', I, sub(L('by', I), mul(v('ny'), v('ovh')))),
                setL('by', J, add(L('by', J), mul(v('ny'), v('ovh')))),
                setL('bz', I, sub(L('bz', I), mul(v('nz'), v('ovh')))),
                setL('bz', J, add(L('bz', J), mul(v('nz'), v('ovh')))),
                // 접근 속도면 충격량 (동일 질량, 계수 (1+REST)/2)
                setVar('rv', add(add(
                    mul(sub(L('vx', J), L('vx', I)), v('nx')),
                    mul(sub(L('vy', J), L('vy', I)), v('ny'))),
                    mul(sub(L('vz', J), L('vz', I)), v('nz')))),
                if_(cmp(v('rv'), '<', 0), [
                    setVar('jm', mul(v('rv'), (1 + REST) / 2)),
                    setL('vx', I, add(L('vx', I), mul(v('jm'), v('nx')))),
                    setL('vx', J, sub(L('vx', J), mul(v('jm'), v('nx')))),
                    setL('vy', I, add(L('vy', I), mul(v('jm'), v('ny')))),
                    setL('vy', J, sub(L('vy', J), mul(v('jm'), v('ny')))),
                    setL('vz', I, add(L('vz', I), mul(v('jm'), v('nz')))),
                    setL('vz', J, sub(L('vz', J), mul(v('jm'), v('nz')))),
                ]),
            ]),
        ]),
    ];
}

// 공 i 의 3D 위치 → 화면 좌표 (psx, psy) 와 지름 (pd). 회전: yaw(y축), pitch(x축).
function projectBall() {
    const I = v('i');
    return [
        setVar('px1', sub(mul(L('bx', I), v('cy_')), mul(L('bz', I), v('sy_')))),
        setVar('pz1', add(mul(L('bx', I), v('sy_')), mul(L('bz', I), v('cy_')))),
        setVar('py2', sub(mul(L('by', I), v('cp_')), mul(v('pz1'), v('sp_')))),
        setVar('pz2', add(mul(L('by', I), v('sp_')), mul(v('pz1'), v('cp_')))),
        setVar('pzc', add(v('pz2'), CAM_D)),
        setL('psx', I, div(mul(FOCAL, v('px1')), v('pzc'))),
        setL('psy', I, div(mul(FOCAL, v('py2')), v('pzc'))),
        setL('pd', I, div(mul(mul(2, L('br', I)), FOCAL), v('pzc'))),
    ];
}

// 상자 꼭짓점 k(변수 'k') → 화면 좌표 (cvx, cvy)
function projectCorner() {
    const K = v('k');
    return [
        setVar('kx1', sub(mul(L('cwx', K), v('cy_')), mul(L('cwz', K), v('sy_')))),
        setVar('kz1', add(mul(L('cwx', K), v('sy_')), mul(L('cwz', K), v('cy_')))),
        setVar('ky2', sub(mul(L('cwy', K), v('cp_')), mul(v('kz1'), v('sp_')))),
        setVar('kz2', add(mul(L('cwy', K), v('sp_')), mul(v('kz1'), v('cp_')))),
        setVar('kzc', add(v('kz2'), CAM_D)),
        setL('cvx', K, div(mul(FOCAL, v('kx1')), v('kzc'))),
        setL('cvy', K, div(mul(FOCAL, v('ky2')), v('kzc'))),
    ];
}

// ── 공 복제본 템플릿 ───────────────────────────────────────────────
const ballPics = [1, 2, 3].map((n) => pictureFromGen(
    shadedBall(50, ['#38bdf8', '#fb923c', '#a3e635'][n - 1]), { id: `pic_ball_${n}` }));

const ballTemplate = {
    id: 'ball_template',
    name: '공',
    scene: 'play',
    objectType: 'sprite',
    pictures: ballPics,
    selectedPictureId: 'pic_ball_1',
    entity: {
        x: 0, y: 0, regX: 50, regY: 50,
        scaleX: 1, scaleY: 1, rotation: 0, direction: 90,
        width: 100, height: 100,
        visible: false,
        rotateMethod: 'none',   // 방향 = 슬롯 번호로 쓴다
    },
    script: [
        // 1) 시작 — 원본 숨기고 공 N 개 복제 (복제마다 슬롯 번호를 next_id 로 넘긴다)
        [
            when.sceneStart(),
            hide(),
            setVar('next_id', 0),
            repeat.basic(N, [
                changeVar('next_id', 1),
                createClone('self'),
                wait(0.05),
            ]),
        ],
        // 2) 복제본 — 슬롯 번호를 방향으로 기억, 매 프레임 투영 위치·지름 반영
        [
            when.cloneStart(),
            turnAbs(getVar('next_id')),
            changeShape(valueAt('bshape', getVar('next_id'))),
            show(),
            repeat.inf([
                locateXY(valueAt('psx', coord('self', 'direction')), valueAt('psy', coord('self', 'direction'))),
                setSize(valueAt('pd', coord('self', 'direction'))),
                wait(0.016),
            ]),
        ],
    ],
};

// ── 물리 + 카메라 매니저 (보이지 않음) ─────────────────────────────
const physicsMgr = obj('physics_mgr', '물리매니저', {
    scene: 'play',
    picture: pictureFromGen(circle(2, '#ffffff'), { id: 'pic_physics_mgr' }),
    entity: {
        x: -300, y: -300,
        regX: 4, regY: 4,
        scaleX: 0.01, scaleY: 0.01, rotation: 0, direction: 90,
        width: 8, height: 8,
        visible: false,
        rotateMethod: 'none',
    },
    threads: [
        // 키 R → 리셋 요청
        [ when.keyPressed('r'), setVar('reset', 1) ],
        // 메인 루프
        [
            when.sceneStart(),
            hide(),
            ...initBlocks(),
            setVar('yaw', 30),
            setVar('pitch', 20),
            setVar('tyaw', 30),
            setVar('tpitch', 20),
            setVar('reset', 0),
            setVar('prev_mx', mouseX()),
            setVar('prev_my', mouseY()),
            repeat.inf([
                // 리셋
                if_(cmp(v('reset'), '==', 1), [
                    ...initBlocks(),
                    setVar('reset', 0),
                ]),
                // 드래그로 시점 회전 (누르고 있을 때만, 도 단위)
                if_(isClicked(), [
                    setVar('dmx', sub(mouseX(), v('prev_mx'))),
                    setVar('dmy', sub(mouseY(), v('prev_my'))),
                    setVar('tyaw', add(v('tyaw'), mul(v('dmx'), 0.5))),
                    setVar('tpitch', add(v('tpitch'), mul(v('dmy'), 0.5))),
                    if_(cmp(v('tpitch'), '>', 75), [ setVar('tpitch', 75) ]),
                    if_(cmp(v('tpitch'), '<', -75), [ setVar('tpitch', -75) ]),
                ]),
                // 시점을 목표 각도로 부드럽게 따라가기
                setVar('yaw', add(v('yaw'), mul(sub(v('tyaw'), v('yaw')), CAM_EASE))),
                setVar('pitch', add(v('pitch'), mul(sub(v('tpitch'), v('pitch')), CAM_EASE))),
                setVar('prev_mx', mouseX()),
                setVar('prev_my', mouseY()),
                // 시점 삼각함수 캐시
                setVar('cy_', cosE(v('yaw'))),
                setVar('sy_', sinE(v('yaw'))),
                setVar('cp_', cosE(v('pitch'))),
                setVar('sp_', sinE(v('pitch'))),
                // 1) 이동·벽 반발
                setVar('i', 0),
                repeat.basic(N, [ changeVar('i', 1), ...integrateBlocks() ]),
                // 2) 공끼리 충돌 (i < j 쌍)
                setVar('i', 0),
                repeat.basic(N, [
                    changeVar('i', 1),
                    setVar('j', 0),
                    repeat.basic(N, [
                        changeVar('j', 1),
                        if_(cmp(v('j'), '>', v('i')), pairBlocks()),
                    ]),
                ]),
                // 3) 화면 투영
                setVar('i', 0),
                repeat.basic(N, [ changeVar('i', 1), ...projectBall() ]),
                wait(0.016),
            ]),
        ],
    ],
});

// ── 상자 모서리 (pen) ─────────────────────────────────────────────
const cubeFrame = obj('cube_frame', '상자', {
    scene: 'play',
    picture: pictureFromGen(circle(2, '#ffffff'), { id: 'pic_cube_frame' }),
    entity: {
        x: -300, y: -300,
        regX: 4, regY: 4,
        scaleX: 0.01, scaleY: 0.01, rotation: 0, direction: 90,
        width: 8, height: 8,
        visible: false,
        rotateMethod: 'none',
    },
    threads: [
        [
            when.sceneStart(),
            hide(),
            setColor('#38bdf8'),
            setThickness(3),
            repeat.inf([
                setVar('k', 0),
                repeat.basic(8, [ changeVar('k', 1), ...projectCorner() ]),
                eraseAll(),
                // 12 모서리: 시작점에 가서 펜을 내리고 끝점까지 긋는다
                ...EDGES.flatMap(([a, b]) => [
                    locateXY(L('cvx', a), L('cvy', a)),
                    startDraw(),
                    locateXY(L('cvx', b), L('cvy', b)),
                    stopDraw(),
                ]),
                wait(0.016),
            ]),
        ],
    ],
});

// ── 안내 문구 ─────────────────────────────────────────────────────
const hint = obj('hint', '안내', {
    objectType: 'textBox',
    text: '드래그: 시점 회전 · R: 다시 시작',
    scene: 'play',
    entity: {
        x: -200, y: 120, regX: 0, regY: 0,
        scaleX: 1, scaleY: 1, rotation: 0, direction: 90,
        width: 300, height: 24,
        font: '14px NanumGothic',
        colour: '#e2e8f0', bgColor: '#0f172a',
        lineBreak: false, textAlign: 0, visible: true,
    },
    threads: [ [ when.sceneStart(), show() ] ],
});

// ── 배경 (맨 뒤) ──────────────────────────────────────────────────
const bg = obj('bg', '배경', {
    scene: 'play',
    picture: pictureFromGen(rect(480, 270, '#0f172a'), { id: 'pic_bg' }),
    entity: {
        x: 0, y: 0, regX: 0, regY: 0,
        scaleX: 1, scaleY: 1, rotation: 0, direction: 90,
        width: 480, height: 270, visible: true,
    },
    threads: [ [ when.sceneStart(), show() ] ],
});

// ── 프로젝트 ──────────────────────────────────────────────────────
export default {
    scenes: [ makeScene('play', '3D 강체 물리') ],
    messages: [],
    variables: [
        { id: 'yaw',     name: 'yaw',   value: '30', visible: false },
        { id: 'pitch',   name: 'pit',   value: '20', visible: false },
        { id: 'prev_mx', name: 'pmx',   value: '0',  visible: false },
        { id: 'prev_my', name: 'pmy',   value: '0',  visible: false },
        { id: 'dmx',     name: 'dmx',   value: '0',  visible: false },
        { id: 'dmy',     name: 'dmy',   value: '0',  visible: false },
        { id: 'cy_',     name: 'cy',    value: '1',  visible: false },
        { id: 'sy_',     name: 'sy',    value: '0',  visible: false },
        { id: 'cp_',     name: 'cp',    value: '1',  visible: false },
        { id: 'sp_',     name: 'sp',    value: '0',  visible: false },
        { id: 'reset',   name: 'rst',   value: '0',  visible: false },
        { id: 'tyaw',    name: 'tyw',   value: '30', visible: false },
        { id: 'tpitch',  name: 'tpt',   value: '20', visible: false },
        { id: 'next_id', name: 'nid',   value: '0',  visible: false },
        { id: 'i',       name: 'i',     value: '0',  visible: false },
        { id: 'j',       name: 'j',     value: '0',  visible: false },
        { id: 'k',       name: 'k',     value: '0',  visible: false },
        { id: 'dx',      name: 'dx',    value: '0',  visible: false },
        { id: 'dy',      name: 'dy',    value: '0',  visible: false },
        { id: 'dz',      name: 'dz',    value: '0',  visible: false },
        { id: 'dsq',     name: 'dsq',   value: '0',  visible: false },
        { id: 'rs',      name: 'rs',    value: '0',  visible: false },
        { id: 'dd',      name: 'dd',    value: '0',  visible: false },
        { id: 'nx',      name: 'nx',    value: '0',  visible: false },
        { id: 'ny',      name: 'ny',    value: '0',  visible: false },
        { id: 'nz',      name: 'nz',    value: '0',  visible: false },
        { id: 'ov',      name: 'ov',    value: '0',  visible: false },
        { id: 'ovh',     name: 'ovh',   value: '0',  visible: false },
        { id: 'rv',      name: 'rv',    value: '0',  visible: false },
        { id: 'jm',      name: 'jm',    value: '0',  visible: false },
        { id: 'px1',     name: 'px1',   value: '0',  visible: false },
        { id: 'pz1',     name: 'pz1',   value: '0',  visible: false },
        { id: 'py2',     name: 'py2',   value: '0',  visible: false },
        { id: 'pz2',     name: 'pz2',   value: '0',  visible: false },
        { id: 'pzc',     name: 'pzc',   value: '1',  visible: false },
        { id: 'kx1',     name: 'kx1',   value: '0',  visible: false },
        { id: 'kz1',     name: 'kz1',   value: '0',  visible: false },
        { id: 'ky2',     name: 'ky2',   value: '0',  visible: false },
        { id: 'kz2',     name: 'kz2',   value: '0',  visible: false },
        { id: 'kzc',     name: 'kzc',   value: '1',  visible: false },
    ],
    lists: [
        { id: 'bx',     name: 'bx',  visible: false, array: INIT_BX.map(String) },
        { id: 'by',     name: 'by',  visible: false, array: INIT_BY.map(String) },
        { id: 'bz',     name: 'bz',  visible: false, array: INIT_BZ.map(String) },
        { id: 'vx',     name: 'vx',  visible: false, array: Array(N).fill('0') },
        { id: 'vy',     name: 'vy',  visible: false, array: Array(N).fill('0') },
        { id: 'vz',     name: 'vz',  visible: false, array: Array(N).fill('0') },
        { id: 'br',     name: 'br',  visible: false, array: BALL_R.map(String) },
        { id: 'bshape', name: 'bsh', visible: false, array: BALL_SHAPE.map(String) },
        { id: 'psx',    name: 'psx', visible: false, array: Array(N).fill('0') },
        { id: 'psy',    name: 'psy', visible: false, array: Array(N).fill('0') },
        { id: 'pd',     name: 'pd',  visible: false, array: Array(N).fill('0') },
        { id: 'cwx',    name: 'cwx', visible: false, array: CW_X.map(String) },
        { id: 'cwy',    name: 'cwy', visible: false, array: CW_Y.map(String) },
        { id: 'cwz',    name: 'cwz', visible: false, array: CW_Z.map(String) },
        { id: 'cvx',    name: 'cvx', visible: false, array: Array(8).fill('0') },
        { id: 'cvy',    name: 'cvy', visible: false, array: Array(8).fill('0') },
    ],
    objects: [
        hint,
        cubeFrame,
        ballTemplate,
        physicsMgr,
        bg,
    ],
    interface: {
        canvasWidth: 480,
        menuWidth: 280,
        object: 'ball_template',
    },
};
