'use strict';

class Book {
  constructor(bookDomElement) {
    this.FINISHING_STEP = 0.1;
    this.FINISHING_DELAY = 16;
    this.SHORT_CLICK_TIME = 200;
    this.ENABLE_POINTER_EVENTS = false;

    this._bookElem = null;
    this._pages = [];
    this._visiblePages = new Set();
    this._currentPage = null;
    this._activePage = null;
    this._futurePage = null;
    this._pointerStart = null;
    this._pointerStartTime = null;
    this._touchEventMode = false;
    this._activePagePosition = null;
    this._finishingDirection = 0;
    this._finishingTicker = null;
    this._activeSide = null;

    if (bookDomElement) {
      this.init(bookDomElement);
    }
  }

  init(bookDomElement) {
    this._bookElem = bookDomElement;
    this._pages = this._bookElem.querySelectorAll('.book__page');

    this._setCurrentPage(-1);
    this._setPageVisibility(this._currentPage - 2, true);
    this._setPageVisibility(this._currentPage, true);
    this._setPageVisibility(this._currentPage + 1, true);
    this._setPageVisibility(this._currentPage + 3, true);

    if (this.ENABLE_POINTER_EVENTS && window.PointerEvent) {
      this._bookElem.addEventListener('pointerdown', this._dragStart.bind(this));
      window.addEventListener('pointermove', this._drag.bind(this));
      window.addEventListener('pointerup', this._dragEnd.bind(this));
      window.addEventListener('pointercancel', this._dragEnd.bind(this));
    } else {
      this._bookElem.addEventListener('touchstart', this._dragStart.bind(this));
      window.addEventListener('touchmove', this._drag.bind(this));
      window.addEventListener('touchend', this._dragEnd.bind(this));
      window.addEventListener('touchcancel', this._dragEnd.bind(this));

      this._bookElem.addEventListener('mousedown', this._dragStart.bind(this));
      window.addEventListener('mousemove', this._drag.bind(this));
      window.addEventListener('mouseup', this._dragEnd.bind(this));
    }
  }

  _setPageVisibility(pageIndex, visible) {
    if (!this._pages[pageIndex] || this._visiblePages.has(pageIndex) === visible) {
      return;
    }

    if (visible) {
      this._visiblePages.add(pageIndex);
      this._pages[pageIndex].classList.add('book__page_visible');
    } else {
      this._visiblePages.delete(pageIndex);
      this._pages[pageIndex].classList.remove('book__page_visible');
    }

    this._bookElem.dispatchEvent(new CustomEvent('pageVisibilityChange', {
      detail: {
        index: pageIndex,
        visible,
        pageDomElement: this._pages[pageIndex],
      },
    }));
  }

  _dragStart(e) {
    if (this._pointerStart !== null) {
      return;
    }
    if (this._activePage !== null) {
      return;
    }

    if (e.touches) {
      this._touchEventMode = true;
    } else if (this._touchEventMode === true) {
      return;
    }

    const posX = this._getPosX(e);

    if (Math.abs(posX) < 0.25) {
      return;
    }

    if (posX > 0) {
      if (this._currentPage + 2 >= this._pages.length) {
        return;
      }

      this._setActivePage(this._currentPage + 1);
      this._setActivePagePosition(1);
      this._setFuturePage(this._currentPage + 2);

      this._setPageVisibility(this._currentPage - 2, false);
      this._setPageVisibility(this._currentPage + 2, true);
    } else {
      if (this._currentPage === -1) {
        return;
      }

      this._setActivePage(this._currentPage - 1);
      this._setActivePagePosition(-1);
      this._setFuturePage(this._currentPage - 2);

      this._setPageVisibility(this._currentPage + 3, false);
      this._setPageVisibility(this._currentPage - 1, true);
    }
    this._pointerStart = posX;
    this._pointerStartTime = new Date().getTime();

    this._bookElem.dispatchEvent(new CustomEvent('pageTurningStatusChange', {
      detail: { pageIsTurning: true },
    }));
  }

  _drag(e) {
    if (this._pointerStart === null) {
      return;
    }

    if (!e.touches && this._touchEventMode === true) {
      return;
    }

    if ((e.touches && e.touches.length > 1) || e.isPrimary === false) {
      this._dragEnd(e, true);
      return;
    }

    this._setActivePagePosition(this._getPosX(e) / Math.abs(this._pointerStart));
  }

  _dragEnd(e, doNotTurnPage) {
    if (this._pointerStart === null) {
      return;
    }

    if (!e.touches && this._touchEventMode === true) {
      return;
    }

    if (!doNotTurnPage) {
      if (new Date().getTime() - this._pointerStartTime < this.SHORT_CLICK_TIME) {
        this._pointerStart = null;
        this._pointerStartTime = null;

        if (this._activePage > this._currentPage) {
          this._startFinishing(-1);
        } else {
          this._startFinishing(1);
        }

        return;
      }
    }

    this._pointerStart = null;
    this._pointerStartTime = null;
    this._startFinishing();
  }

  _getPosX(e) {
    let clientX;
    if (['touchstart', 'touchmove'].includes(e.type)) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }

    const clientRect = this._bookElem.getBoundingClientRect();
    const x = clientX - clientRect.x - clientRect.width / 2;
    return x / clientRect.width * 2;
  }

  _setCurrentPage(newCurrentPage) {
    const previousPage = this._currentPage;

    this._pages[this._currentPage - 2] && this._pages[this._currentPage - 2].classList.remove('book__page_previous', 'book__page_first-previous');
    this._pages[this._currentPage - 1] && this._pages[this._currentPage - 1].classList.remove('book__page_previous', 'book__page_second-previous');
    this._pages[this._currentPage] && this._pages[this._currentPage].classList.remove('book__page_current');
    this._pages[this._currentPage + 1] && this._pages[this._currentPage + 1].classList.remove('book__page_current');
    this._pages[this._currentPage + 2] && this._pages[this._currentPage + 2].classList.remove('book__page_next', 'book__page_first-next');
    this._pages[this._currentPage + 3] && this._pages[this._currentPage + 3].classList.remove('book__page_next', 'book__page_second-next');

    this._currentPage = newCurrentPage;

    this._pages[this._currentPage - 2] && this._pages[this._currentPage - 2].classList.add('book__page_previous', 'book__page_first-previous');
    this._pages[this._currentPage - 1] && this._pages[this._currentPage - 1].classList.add('book__page_previous', 'book__page_second-previous');
    this._pages[this._currentPage] && this._pages[this._currentPage].classList.add('book__page_current');
    this._pages[this._currentPage + 1] && this._pages[this._currentPage + 1].classList.add('book__page_current');
    this._pages[this._currentPage + 2] && this._pages[this._currentPage + 2].classList.add('book__page_next', 'book__page_first-next');
    this._pages[this._currentPage + 3] && this._pages[this._currentPage + 3].classList.add('book__page_next', 'book__page_second-next');

    this._bookElem.dispatchEvent(new CustomEvent('currentPageChange', {
      detail: {
        currentPage: this._currentPage,
        previousPage,
      },
    }));
  }

  _setFuturePage(newFuturePage) {
    this._pages[this._futurePage] && this._pages[this._futurePage].classList.remove('book__page_future');
    this._pages[this._futurePage + 1] && this._pages[this._futurePage + 1].classList.remove('book__page_future');

    this._futurePage = newFuturePage;
    if (this._futurePage === null) {
      return;
    }

    this._pages[this._futurePage] && this._pages[this._futurePage].classList.add('book__page_future');
    this._pages[this._futurePage + 1] && this._pages[this._futurePage + 1].classList.add('book__page_future');
  }

  _setActivePage(newActivePage) {
    this._pages[this._activePage] && this._pages[this._activePage].classList.remove('book__page_active', 'book__page_first-active');
    this._pages[this._activePage + 1] && this._pages[this._activePage + 1].classList.remove('book__page_active', 'book__page_second-active');

    this._activePage = newActivePage;
    if (this._activePage === null) {
      this._setActiveSide(null);
      return;
    }

    this._pages[this._activePage] && this._pages[this._activePage].classList.add('book__page_active', 'book__page_first-active');
    this._pages[this._activePage + 1] && this._pages[this._activePage + 1].classList.add('book__page_active', 'book__page_second-active');
  }

  _setActivePagePosition(position) {
    this._activePagePosition = Math.min(1, Math.max(-1, position));
    this._bookElem.style.setProperty('--active-page-position', this._activePagePosition);
    this._setActiveSide(position);
  }

  _setActiveSide(position) {
    let newSide;
    if (position === null) {
      newSide = null;
    } else {
      newSide = position > 0 ? 'right' : 'left';
    }

    if (newSide === this._activeSide) {
      return;
    }

    if (this._activeSide === 'left') {
      this._bookElem.classList.remove('book_active-side_left');
    }

    if (this._activeSide === 'right') {
      this._bookElem.classList.remove('book_active-side_right');
    }

    if (newSide) {
      this._bookElem.classList.add(`book_active-side_${newSide}`);
    }

    this._activeSide = newSide;
  }

  _startFinishing(direction) {
    this._stopFinishing();

    if (direction !== undefined) {
      this._finishingDirection = direction;
    } else {
      this._finishingDirection = Math.sign(this._activePagePosition) || -1;
    }

    this._finishingTicker = setInterval(this._finishing.bind(this), this.FINISHING_DELAY);
  }

  _finishing() {
    this._setActivePagePosition(this._activePagePosition + this._finishingDirection * this.FINISHING_STEP);

    if (this._finishingDirection === 1 && this._activePagePosition === 1) {
      this._stopFinishing();
      this._setCurrentPage(this._activePage - 1);
      this._setActivePage(null);
      this._setFuturePage(null);

      this._setPageVisibility(this._currentPage + 2, false);
      this._setPageVisibility(this._currentPage - 2, true);

      this._touchEventMode = false;
    } else if (this._finishingDirection === -1 && this._activePagePosition === -1) {
      this._stopFinishing();
      this._setCurrentPage(this._activePage + 1);
      this._setActivePage(null);
      this._setFuturePage(null);

      this._setPageVisibility(this._currentPage - 1, false);
      this._setPageVisibility(this._currentPage + 3, true);

      this._touchEventMode = false;
    }
  }

  _stopFinishing() {
    this._finishingDirection = 0;

    this._bookElem.dispatchEvent(new CustomEvent('pageTurningStatusChange', {
      detail: { pageIsTurning: false },
    }));

    if (!this._finishingTicker) {
      return;
    }

    clearInterval(this._finishingTicker);
    this._finishingTicker = null;
  }

  get isPageTurning() {
    return this._finishingDirection !== 0;
  }

  get currentPage() {
    return this._currentPage;
  }

  get visiblePages() {
    return this._visiblePages;
  }

  get bookElement() {
    return this._bookElem;
  }
}
