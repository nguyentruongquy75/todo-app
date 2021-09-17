const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const taskNameInput = $('#task-name');
const taskDescInput = $('#task-desc');
const createTask = $('.create-task');
const taskList = $('.today-task__list');
const taskDetail = $('.task-detail');
const taskDetailClose = $('.task-detail__close');
const overlay = $('.overlay');
const taskDetailName = $('.task-detail__name');
const taskDetailDesc = $('.task-detail__desc');
const username = $('.username');
const message = $('.message');
const getInfoUser = $('.getInfoUser');
const wrapper = $('.wrapper');


const cookies = {
    set(cookieName, cookieValue, exdays) {
        const date = new Date();
        date.setTime(date.getTime() + (exdays * 24 * 60 * 60 * 1000));
        const expries = "expires="+ date.toUTCString();
        if (typeof cookieValue == 'object') {
            cookieValue = JSON.stringify(cookieValue);
        }
        document.cookie = cookieName + '=' + cookieValue + ';' + expries + '; path = /';
    },
    setToDayFinished(cookieName, cookieValue) {
        const date = new Date();
        date.setDate(date.getDate + 1);
        date.setHours(0,0,0,0);
        const expries = "expires="+ date.toUTCString();
        if (typeof cookieValue == 'object') {
            cookieValue = JSON.stringify(cookieValue);
        }
        document.cookie = cookieName + '=' + cookieValue + ';' + expries + '; path = /';
    },
    get(cookieName) {
        const arrCookies = document.cookie.split(';');
        
        const cookieValue = arrCookies.find((value) => {
            return value.includes(cookieName);
        });

        return cookieValue?.slice(cookieValue.indexOf('=') + 1);
    },
    removeCookie(cookieName) {
        document.cookie = cookieName + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
}

const app = {
    taskList: [],
    
    handleEvent() {
        const createTaskBtn = $('.create-task-btn');
        const newTaskBtn = $('.create-task-button');
        const createTaskClose = $('.create-task__close');
        let taskItemPos = 0;
        let taskItemSwipe = null;
        const getInfoUserBtn = $('.getInfoUser__btn');

        const _this = this;

        createTaskBtn.onclick = function () {
            createTask.classList.add('display');
        }

        // Close createTask
        createTaskClose.onclick = function () {
            createTask.classList.remove('display');
            _this.reset();
        }

        // Finished click
        taskList.onclick = function (e) {
            if (e.target.closest('input[type="checkbox"]')) {
                const taskItem = e.target.parentElement.parentElement;
                const index = +taskItem.dataset.index;

                if (e.target.checked) {
                    taskItem.classList.add('today-task__item--finished');
                    _this.taskList[index].isFinished = true;
                    //changeIndex
                    if (!_this.taskList[index + 1]?.isFinished) {
                        _this.pushTask(_this.taskList[index]);
                        _this.removeTask(index);
                        _this.renderTask();
                    }
                } else {
                    taskItem.classList.remove('today-task__item--finished');
                    _this.taskList[index].isFinished = false;
                    _this.taskList[index].isDeleted = true;
                    const cloneTask = {};
                    Object.assign(cloneTask, _this.taskList[index]);
                    cloneTask.isDeleted = false;
                    _this.addTask(cloneTask);
                    _this.removeTask(_this.getDeletedTask());
                    _this.renderTask();
                }

                _this.updateTaskCookie();
            } else {
                // task detail
                let taskItem = null;
                if (e.target.classList.contains('today-task__item')) {
                    taskItem = e.target;
                } else {
                    taskItem = e.target.parentElement;
                }
                const index = taskItem.dataset.index;
                _this.renderTaskDetail(index);
                _this.displayTaskDetail();
                _this.displayOverlay(); 
            }
        }

        overlay.onclick = function () {
            _this.hideTaskDetail();
            _this.hideOverlay();
        }

        // Close taskDetail
        taskDetailClose.onclick = function () {
            _this.hideOverlay();
            _this.hideTaskDetail();
        }

        // Submit task
        newTaskBtn.onclick = function () {
            const message = $('.create-task__input-message');
            const validate = _this.validate();

            if (validate) {
                _this.addTask(validate);
                _this.renderTask();
                _this.updateTaskCookie();
            } else {
                message.textContent = 'Field can not blank';
            }
        }

        //swipe

        taskList.ontouchstart = function(e) {
            if (e.target.closest('.today-task__item')) {
                taskItemPos = e.touches[0].clientX;
            }
        }

        taskList.ontouchmove = function(e) {
            if (e.target.closest('.today-task__item')) {
                if (e.target.classList.contains('today-task__item')) {
                    taskItemSwipe = e.target;
                } else {
                    taskItemSwipe = e.target.parentElement;
                }
                if (e.touches[0].clientX < taskItemPos) {
                    taskItemSwipe.style = `transform: translateX(${-(taskItemPos - e.touches[0].clientX)}px)`;
                }
            }
        }

        taskList.ontouchend = function(e) {
            const info = taskItemSwipe?.getBoundingClientRect();
            if (Math.abs(info?.x) > info?.width * 0.5) {
                taskItemSwipe.remove();
                _this.removeTask(taskItemSwipe.dataset.index);
                _this.renderTask();
                _this.updateTaskCookie();
            } else {
                if (taskItemSwipe) {
                    taskItemSwipe.style = null;
                }
            }
        }

        // user info
        getInfoUserBtn.onclick = function () {
            if (_this.validateInfoUser()) {
                cookies.set('username', username.value, 365);
                _this.hideUserInfo();
                _this.displayWrapper();
                $('.heading').textContent = 'What\'s up, ' + cookies.get('username');

            } else {
                message.textContent = 'Field can not blank';
            }
        }

        // onblur taskDetailName
        taskDetailName.onblur = function () {
            _this.updateTaskDetailName();
            _this.renderTask();
            _this.updateTaskCookie();
        }

        //onblur taskDetailDesc
        taskDetailDesc.onblur = function () {
            _this.updateTaskDetailDesc();
            _this.renderTask();
            _this.updateTaskCookie();
        }
        
    },
    validate() {
        const regex = /\w/g;

        const name = taskNameInput.value;
        const desc = taskDescInput.value;
        const isFlag = $('#flag').checked;
        const color =  $('input[name="color"]:checked').value;

        if (regex.test(taskNameInput.value))
            return {
                name,
                desc,
                isFlag,
                color,
                isFinished: false
            };
        return false; 
    },
    validateInfoUser() {
        const regex = /\w/g;
        if (regex.test(username.value)) {
            return username.value;
        }
        return false;
    },
    addTask(task) {
        if (task.isFlag) {
            this.taskList.unshift(task);
        } else {
            const finishedTaskIndex = this.getFinishedTaskIndex();
            if (finishedTaskIndex !== -1) {
                this.insertTask(finishedTaskIndex, task);
            } else {
                this.taskList.push(task);
            }
        }
        createTask.classList.remove('display');
        this.reset();
    },
    renderTask() {
        const html = this.taskList.map((value, index) => {
            return `
                <li class="today-task__item today-task__item--color-${value.color} ${value.isFinished ? 'today-task__item--finished':''}" data-index=${index}>
                    <div class="today-task__item-checkbox">
                        <input ${value.isFinished ? 'checked' : ''} type="checkbox">
                    </div>
                    <span class="today-task__item-name">${value.name}</span>
                    ${value.isFlag ? '<i class="far fa-flag today-task__item--flag"></i>' : ''}
                </li>`;
        });

        taskList.innerHTML = html.join('');
    },  
    reset() {
        taskNameInput.value = null;
        taskDescInput.value = null;
        $('#flag').checked = false;
        $('input[name="color"]').checked = true;
        $('.create-task__input-message').textContent = '';
    },  
    updateCheckboxList() {
        checkboxList = $$('.today-task__item-checkbox input[type="checkbox"]');
    },
    removeTask(index) {
        if (!(index == -1)) {
            this.taskList.splice(index,1);
        }
    },
    getFinishedTaskIndex() {
        const result = this.taskList.find((value) => {
            return value.isFinished;
        });
        return this.taskList.indexOf(result);
    },
    getDeletedTask() {
        return this.taskList.findIndex((value) => {
            return value.isDeleted;
        })
    },
    insertTask(index, task) {
        this.taskList.splice(index, 0, task);
    },
    pushTask(task) {
        this.taskList.push(task);
    },
    displayTaskDetail() {
        taskDetail.classList.add('display');
    },
    displayOverlay() {
        overlay.classList.add('display');
    },
    hideTaskDetail() {
        //remove color
        taskDetail.classList.remove(Array.from(taskDetail.classList).find((value) => value.startsWith('task-detail--color-')));
        taskDetail.classList.remove('display');
    },
    hideOverlay() {
        overlay.classList.remove('display');
    },
    renderTaskDetail(index) {
        taskDetail.setAttribute('data-index', index);
        taskDetail.classList.add('task-detail--color-'+this.taskList[index].color);
        taskDetailName.textContent = this.taskList[index].name;
        taskDetailDesc.textContent = this.taskList[index].desc;
    },
    updateTaskDetailName() {
        const index = +taskDetail.dataset.index;
        this.taskList[index].name = taskDetailName.textContent;
    },
    updateTaskDetailDesc() {
        const index = +taskDetail.dataset.index;
        this.taskList[index].desc = taskDetailDesc.textContent;
    },
    hideUserInfo() {
        getInfoUser.classList.remove('display-flex');
    },
    displayWrapper() {
        wrapper.classList.add('display');
    },
    updateTaskCookie() {
        cookies.setToDayFinished('tasks', this.taskList);
    },
    start() {
        this.renderTask();
        this.handleEvent();
    }

}


app.start();

// cookies.removeCookie('username'); 
// cookies.removeCookie('tasks'); 

window.onload = function () {
    if (!cookies.get('username')) {
        getInfoUser.classList.add('display-flex');
    } else {
        if (cookies.get('tasks')) {
            app.taskList = JSON.parse(cookies.get('tasks'));
        }
        app.renderTask();
        wrapper.classList.add('display');
        $('.heading').textContent = 'What\'s up, ' + cookies.get('username');
    }
}





