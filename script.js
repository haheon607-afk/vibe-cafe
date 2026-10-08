/* ============================================================
   바이브 카페 - script.js
   기능: 실시간 금액 계산 / 유효성 검사 / 주문 저장 및 내역 표시 / 탭 전환
   ============================================================ */


/* ────────────────────────────────────────────────────────────
   Supabase 클라이언트 초기화
   ※ 아래 두 값은 Supabase 대시보드 → Project Settings → API 에서 복사하세요.
      index.html에서 SDK를 먼저 로드했으므로 supabase 전역 객체를 바로 사용할 수 있습니다.
──────────────────────────────────────────────────────────── */

// Supabase 프로젝트 URL (예: https://xxxx.supabase.co)
const SUPABASE_URL = 'https://ffobirltzyfkynlnkgbl.supabase.co';

// Supabase anon public key (eyJhbGci... 로 시작하는 긴 문자열)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmb2Jpcmx0enlma3lubG5rZ2JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTU5MTMsImV4cCI6MjEwNjk3MTkxM30.JbjLiiuBIVQhusZQmtWCI110Sb_FzdhU2dlFWWA_5n4';

// createClient()로 DB에 접근할 수 있는 클라이언트 객체를 만듭니다.
// 이 객체(supabaseClient)를 통해 SELECT / INSERT 등을 실행합니다.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


/* ────────────────────────────────────────────────────────────
   DOM 요소 미리 가져오기
   자주 쓰는 요소를 변수에 담아두면 코드가 짧아지고 속도도 빠릅니다.
──────────────────────────────────────────────────────────── */

// 폼 전체
const orderForm        = document.getElementById('order-form');

// 입력 필드
const nameInput        = document.getElementById('customer-name');
const phoneInput       = document.getElementById('customer-phone'); // 전화번호
const drinkSelect      = document.getElementById('drink-select');
const quantityInput    = document.getElementById('quantity');
const requestInput     = document.getElementById('request');

// 사이즈 라디오 버튼 전체 (NodeList)
const sizeRadios       = document.querySelectorAll('input[name="size"]');

// 추가 옵션 체크박스 전체 (NodeList)
const optionCheckboxes = document.querySelectorAll('input[name="options"]');

// 예상 금액 표시 span
const estimatedPriceEl = document.getElementById('estimated-price');

// 주문 확인 메시지 영역
const confirmationEl   = document.getElementById('order-confirmation');

// 버튼
const submitBtn        = document.getElementById('btn-submit');
const resetBtn         = document.getElementById('btn-reset');

// 탭 버튼
const tabOrderBtn      = document.getElementById('tab-order');
const tabHistoryBtn    = document.getElementById('tab-history');

// 탭 패널
const panelOrder       = document.getElementById('panel-order');
const panelHistory     = document.getElementById('panel-history');

// 주문 내역 관련 요소
const orderBadge       = document.getElementById('order-badge');   // 건수 배지
const historyEmpty     = document.getElementById('history-empty'); // 빈 안내 문구
const orderList        = document.getElementById('order-list');    // 카드 목록 <ul>
const historyFooter    = document.getElementById('history-footer');// 요약 + 전체삭제
const historyTotalEl   = document.getElementById('history-total'); // 총 금액 표시
const btnClearAll      = document.getElementById('btn-clear-all'); // 모두 지우기


/* ────────────────────────────────────────────────────────────
   주문 데이터 저장소
   orders 배열에 주문 객체를 push해서 관리합니다.
   nextOrderId는 주문번호를 순서대로 부여하기 위한 카운터입니다.
──────────────────────────────────────────────────────────── */
let orders     = [];   // 주문 객체들이 담길 배열
let nextOrderId = 1;   // 다음 주문 번호 (1부터 시작)


/* ============================================================
   핵심 함수: calculateTotal()
   현재 입력값을 읽어 총 예상 금액(숫자)을 반환합니다.
   submit 이벤트와 실시간 표시 모두 이 함수를 재사용합니다.
   ============================================================ */
function calculateTotal() {
  // 1) 음료 가격: 선택된 <option>의 data-price 읽기
  const selectedOption = drinkSelect.options[drinkSelect.selectedIndex];
  const drinkPrice     = Number(selectedOption.dataset.price) || 0;

  // 2) 사이즈 추가 금액: checked된 라디오의 data-price 읽기
  const checkedSize = [...sizeRadios].find(r => r.checked);
  const sizePrice   = checkedSize ? Number(checkedSize.dataset.price) : 0;

  // 3) 추가 옵션 합계: 체크된 체크박스의 data-price를 모두 더하기
  const optionsPrice = [...optionCheckboxes]
    .filter(cb => cb.checked)
    .reduce((sum, cb) => sum + Number(cb.dataset.price), 0);

  // 4) 수량: 최소 1 보장
  const quantity = Math.max(1, Number(quantityInput.value) || 1);

  // 5) 최종: (음료 + 사이즈 + 옵션) × 수량
  return (drinkPrice + sizePrice + optionsPrice) * quantity;
}


/* ============================================================
   금액 화면 업데이트: updatePriceDisplay()
   calculateTotal() 결과를 예상 금액 span에 반영합니다.
   ============================================================ */
function updatePriceDisplay() {
  const total = calculateTotal();
  // toLocaleString('ko-KR'): 숫자에 천 단위 콤마 → 5000 → "5,000"
  estimatedPriceEl.textContent = total.toLocaleString('ko-KR') + '원';
}


/* ============================================================
   이벤트 리스너 등록: 입력값이 바뀔 때마다 금액 갱신
   ============================================================ */
drinkSelect.addEventListener('change', updatePriceDisplay);
sizeRadios.forEach(r  => r.addEventListener('change', updatePriceDisplay));
optionCheckboxes.forEach(cb => cb.addEventListener('change', updatePriceDisplay));
quantityInput.addEventListener('input', updatePriceDisplay);


/* ============================================================
   탭 전환 기능: switchTab(targetTab)
   'order' 또는 'history' 문자열을 받아 해당 패널을 보여줍니다.
   ============================================================ */
function switchTab(targetTab) {
  if (targetTab === 'order') {
    // 주문하기 탭 활성화
    tabOrderBtn.classList.add('tab-active');
    tabOrderBtn.setAttribute('aria-selected', 'true');
    tabHistoryBtn.classList.remove('tab-active');
    tabHistoryBtn.setAttribute('aria-selected', 'false');

    // 패널 전환
    panelOrder.classList.remove('hidden');
    panelHistory.classList.add('hidden');

  } else {
    // 주문 내역 탭 활성화
    tabHistoryBtn.classList.add('tab-active');
    tabHistoryBtn.setAttribute('aria-selected', 'true');
    tabOrderBtn.classList.remove('tab-active');
    tabOrderBtn.setAttribute('aria-selected', 'false');

    // 패널 전환
    panelHistory.classList.remove('hidden');
    panelOrder.classList.add('hidden');
  }
}

// 탭 버튼 클릭 이벤트
tabOrderBtn.addEventListener('click',   () => switchTab('order'));
tabHistoryBtn.addEventListener('click', () => switchTab('history'));


/* ============================================================
   주문 내역 렌더링: renderOrders()
   orders 배열을 읽어 주문 카드 목록을 통째로 다시 그립니다.
   추가·삭제 등 배열이 바뀔 때마다 이 함수 하나를 호출합니다.
   ============================================================ */
function renderOrders() {
  /* ── 배지 업데이트 ─────────────────────────────────────── */
  const count = orders.length;
  orderBadge.textContent = count;

  if (count > 0) {
    // 주문이 있으면 배지를 보이게
    orderBadge.classList.remove('hidden');
  } else {
    orderBadge.classList.add('hidden');
  }

  /* ── 주문이 없을 때 안내 문구 표시 ──────────────────────── */
  if (count === 0) {
    historyEmpty.classList.remove('hidden');  // "아직 주문 내역이 없어요" 표시
    orderList.innerHTML = '';                 // 카드 목록 비우기
    historyFooter.classList.add('hidden');    // 요약 영역 숨기기
    return;                                   // 더 이상 그릴 것 없음
  }

  // 주문이 있으면 안내 문구 숨기기
  historyEmpty.classList.add('hidden');
  historyFooter.classList.remove('hidden');

  /* ── 카드 목록 그리기 ──────────────────────────────────── */
  // 기존 내용 초기화 후 새로 그림
  orderList.innerHTML = '';

  // 최신 주문이 맨 위에 오도록 배열을 역순으로 순회
  // slice()로 원본 배열을 건드리지 않고 복사본을 뒤집습니다.
  [...orders].reverse().forEach(order => {

    // <li> 카드 요소 생성
    const li = document.createElement('li');
    li.className = 'order-card';
    li.dataset.id = order.id; // 나중에 취소 시 찾을 수 있도록 id 저장

    /* ── 1줄: "#1 홍길동님 · 5,000원" ─────────────────────
       보안: 손님 입력값(order.name)은 textContent로 넣어야 합니다.
       innerHTML을 쓰면 악의적인 스크립트가 실행될 수 있습니다(XSS).
       createElement + textContent 조합으로 안전하게 처리합니다.
    ───────────────────────────────────────────────────── */
    const titleEl = document.createElement('p');
    titleEl.className = 'order-card-title';
    // 주문번호·이름·금액은 각각 별도 textNode로 조합
    titleEl.textContent =
      `#${order.id} ` + order.name + `님 · ` +
      order.total.toLocaleString('ko-KR') + '원';

    /* ── 2줄: "카페라떼 M사이즈 (샷 추가) 1잔" ─────────────
       옵션이 없으면 괄호 부분 생략 (script 상단의 주문 저장 로직과 동일)
    ───────────────────────────────────────────────────── */
    const optionPart = order.options.length > 0
      ? ` (${order.options.join(', ')})` : '';

    const detailEl = document.createElement('p');
    detailEl.className = 'order-card-detail';
    detailEl.textContent =
      `${order.drink} ${order.size}사이즈${optionPart} ${order.quantity}잔`;

    /* ── 3줄: 요청사항(있을 때만) + 주문 시간 ──────────────
       요청사항도 손님 입력값이므로 textContent로 처리합니다.
    ───────────────────────────────────────────────────── */
    const metaEl = document.createElement('p');
    metaEl.className = 'order-card-meta';

    // 요청사항이 있을 때만 한 줄 추가
    if (order.request) {
      const reqLine = document.createElement('span');
      reqLine.textContent = '💬 ' + order.request;
      metaEl.appendChild(reqLine);
      metaEl.appendChild(document.createElement('br')); // 줄바꿈
    }

    // 주문 시간 (항상 표시)
    const timeSpan = document.createElement('span');
    timeSpan.textContent = '🕐 ' + order.time;
    metaEl.appendChild(timeSpan);

    /* ── 취소 버튼 ─────────────────────────────────────────
       각 버튼에 data-id를 저장해 두고,
       클릭 시 해당 id의 주문을 orders 배열에서 제거합니다.
    ───────────────────────────────────────────────────── */
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-cancel';
    cancelBtn.textContent = '취소';
    cancelBtn.dataset.id  = order.id;

    cancelBtn.addEventListener('click', function () {
      // confirm()으로 한 번 더 확인
      const confirmed = confirm(
        `#${order.id} ${order.name}님의 주문을 취소하시겠어요?`
      );
      if (!confirmed) return; // '아니오' 클릭 시 아무것도 하지 않음

      // 해당 id를 제외한 새 배열로 교체 (filter는 원본을 바꾸지 않음)
      orders = orders.filter(o => o.id !== order.id);

      // 화면 다시 그리기
      renderOrders();
    });

    // 카드 안에 요소 조립
    li.appendChild(cancelBtn);
    li.appendChild(titleEl);
    li.appendChild(detailEl);
    li.appendChild(metaEl);

    // 목록에 카드 추가
    orderList.appendChild(li);
  });

  /* ── 총 주문 금액 요약 업데이트 ────────────────────────── */
  const grandTotal = orders.reduce((sum, o) => sum + o.total, 0);
  historyTotalEl.textContent =
    `총 주문 금액: ${grandTotal.toLocaleString('ko-KR')}원 (${count}건)`;
}


/* ============================================================
   주문하기 버튼 클릭: 유효성 검사 + 주문 저장 + 확인 메시지
   ============================================================ */
orderForm.addEventListener('submit', async function (event) {
  // 기본 동작(페이지 새로고침) 막기
  event.preventDefault();

  // ── 유효성 검사 1: 이름 ─────────────────────────────────
  if (nameInput.value.trim() === '') {
    alert('이름을 입력해주세요.');
    nameInput.focus();
    return;
  }

  // ── 유효성 검사 2: 음료 선택 ────────────────────────────
  if (drinkSelect.value === '') {
    alert('음료를 선택해주세요.');
    drinkSelect.focus();
    return;
  }

  // ── 주문 정보 수집 ───────────────────────────────────────

  const customerName  = nameInput.value.trim();
  const customerPhone = phoneInput.value.trim() || null; // 빈 문자열은 null로

  // 음료 이름: 가격 부분 제거 ("카페라떼 4,000원" → "카페라떼")
  const drinkText = drinkSelect.options[drinkSelect.selectedIndex].text;
  const drinkName = drinkText.replace(/\s*\d[\d,]*원$/, '').trim();

  // 사이즈
  const checkedSize = [...sizeRadios].find(r => r.checked);
  const sizeName    = checkedSize ? checkedSize.value : 'M';

  // 추가 옵션 이름 배열
  const selectedOptions = [...optionCheckboxes]
    .filter(cb => cb.checked)
    .map(cb => {
      const label    = cb.closest('label');
      const priceTag = label.querySelector('.price-tag');
      return label.textContent.replace(priceTag.textContent, '').trim();
    });

  // 수량
  const quantity = Math.max(1, Number(quantityInput.value) || 1);

  // 요청사항 (공백 제거)
  const requestText = requestInput.value.trim();

  // 총 금액
  const total = calculateTotal();

  // 현재 시각 포맷: "오전 10:30" 형태
  const now     = new Date();
  const timeStr = now.toLocaleTimeString('ko-KR', {
    hour:   '2-digit',
    minute: '2-digit'
  });

  // ── Supabase에 주문 저장 ─────────────────────────────────
  /*
    await: DB 전송이 끝날 때까지 기다리는 키워드입니다.
    전송 중 버튼을 비활성화(disabled)해 두 번 클릭되는 것을 막습니다.
  */
  submitBtn.disabled    = true;          // 버튼 잠금
  submitBtn.textContent = '전송 중...';  // 텍스트로 진행 상태 표시

  // 음료 기본 가격(drink_price): 선택된 <option>의 data-price 읽기
  const drinkPrice = Number(
    drinkSelect.options[drinkSelect.selectedIndex].dataset.price
  ) || 0;

  /*
    supabaseClient.from('테이블명').insert({열: 값, ...})
    - cafe_menu03 테이블에 한 행을 추가합니다.
    - .select().single(): 저장된 행을 즉시 반환받아 DB가 부여한 id를 씁니다.
  */
  const { data, error } = await supabaseClient
    .from('cafe_menu03')           // 저장할 테이블 이름
    .insert({
      customer_name: customerName,          // 주문자 이름
      phone:         customerPhone,         // 전화번호 (없으면 null)
      drink:         drinkName,             // 음료 이름 (예: 카페라떼)
      drink_price:   drinkPrice,            // 음료 기본 가격 (옵션·사이즈 제외)
      size:          sizeName,              // 사이즈 (S / M / L)
      options:       selectedOptions,       // 추가 옵션 배열 (예: ["샷 추가"])
      quantity:      quantity,              // 수량
      request:       requestText || null,   // 요청사항 (없으면 null)
      total_price:   total                  // 최종 결제 금액
    })
    .select()   // 저장된 행 반환 (id 등을 받아오기 위해)
    .single();  // 단일 행이므로 배열이 아닌 객체로 받음

  // 버튼 원래 상태로 복구
  submitBtn.disabled    = false;
  submitBtn.textContent = '주문하기';

  // ── 저장 실패 처리 ──────────────────────────────────────
  if (error) {
    // 개발자용: 브라우저 콘솔(F12)에 자세한 에러 출력
    console.error('Supabase 저장 오류:', error);
    // 사용자용: 간단한 알림
    alert('주문 저장에 실패했어요. 잠시 후 다시 시도해주세요.');
    return; // 이후 코드 실행 중단
  }

  /* ── 주문 객체 생성 후 배열에 저장 ─────────────────────── */
  /*
    DB가 자동 부여한 id(data.id)를 사용해
    로컬 배열과 Supabase의 ID가 일치하게 합니다.
  */
  const newOrder = {
    id:       data.id,   // Supabase DB가 부여한 실제 PK
    name:     customerName,
    drink:    drinkName,
    size:     sizeName,
    options:  selectedOptions,
    quantity: quantity,
    request:  requestText,
    total:    total,
    time:     timeStr
  };

  orders.push(newOrder);

  // ── 주문 확인 메시지 표시 ───────────────────────────────
  const optionText = selectedOptions.length > 0
    ? ` (${selectedOptions.join(', ')})` : '';
  const confirmMsg =
    `${customerName}님, ` +
    `${drinkName} ${sizeName}사이즈${optionText} ` +
    `${quantity}잔, ` +
    `총 ${total.toLocaleString('ko-KR')}원 주문이 접수되었습니다!`;

  // 보안: 사용자 입력값이 들어가므로 textContent 사용
  confirmationEl.textContent = confirmMsg;
  confirmationEl.classList.remove('hidden');
  confirmationEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // ── 주문 내역 갱신 ──────────────────────────────────────
  renderOrders();
});


/* ============================================================
   다시 작성 버튼: 주문서만 초기화 (주문 내역은 유지)
   ============================================================ */
resetBtn.addEventListener('click', function () {
  // form.reset(): 모든 입력값을 HTML 기본값으로 되돌림
  // (수량 1, 사이즈 M, 체크박스 해제, 드롭다운 첫 항목)
  orderForm.reset();

  // 예상 금액 초기화
  estimatedPriceEl.textContent = '0원';

  // 주문 확인 메시지 숨기기
  confirmationEl.classList.add('hidden');
  confirmationEl.textContent = '';

  // ※ orders 배열은 건드리지 않음 → 주문 내역 유지
});


/* ============================================================
   내역 모두 지우기 버튼
   ============================================================ */
btnClearAll.addEventListener('click', function () {
  // confirm()으로 한 번 더 확인
  if (!confirm('주문 내역을 모두 지우시겠어요?')) return;

  orders = [];          // 배열 비우기
  renderOrders();       // 화면 갱신
});


/* ============================================================
   페이지 최초 로드 시 초기화
   ============================================================ */
updatePriceDisplay(); // 기본 선택(M 사이즈) 반영, 음료 미선택이므로 0원
renderOrders();       // 배지·목록 초기 상태 세팅
