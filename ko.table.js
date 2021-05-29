/// <reference path="../lib/knockout/knockout.js" />
/// <reference path="../lib/knockout/knockout.mapping.js" />
/// <reference path="../lib/knockout/knockout.validation.js" />
/// <reference path="../lib/jquery/dist/jquery.min.js" />
/// <reference path="../lib/jquery-validation/dist/jquery.validate.js" />
/// <reference path="../lib/sweetalert2/sweetalert2.js" />
/**
 *  ViewModel Class for the koTable
 *  @param {Object} params - The user's defined configuration
 **/
let koTable = function (params) {
    /**
     *  Definition for each row in the koTable
     *  @param {Object} row - The record for one row of the table
     **/
    let koTableRow = function (row) {
        let self = this;
        ko.mapping.fromJS(row, {}, self);
    };

    /**
     *  Definition for each field in the koTable
     *  @param {Object} field - The column's definition for one field of the table 
     **/
    let koTableField = function (field) {
        let self = this;
        self.key = ko.observable(false);
        self.header = ko.observable("");
        self.dataMember = ko.observable("");
        self.list = ko.observable(true);
        self.type = ko.observable("");
        self.sortBy = ko.observable(0);

        self.edit = ko.observable(true);
        self.add = ko.observable(true);
        self.value = ko.observable(0);
        self.required = ko.observable(true);

        self.rows = ko.observable(3);
        self.cols = ko.observable(25);

        self.sortByClass = ko.computed(function () {
            switch (self.sortBy()) {
                case 1:
                    return "fa-sort-up";
                case 2:
                    return "fa-sort-down";
                default:
                    return "fa-sort";
            }
        }, self);
        self.sortByDirection = ko.pureComputed({
            read: self.sortBy,
            write: function (value) {
                if (value >= 3 || value < 0)
                    self.sortBy(0);
                else
                    self.sortBy(value);
            },
            owner: self
        });

        ko.mapping.fromJS(field, {}, self);
    };

    let self = this;


    /**
     *  In case the user don't specify some values use this ones as defaults.
     *  @function defaults - A JSON with some default values.
     **/
    self.defaults = {
        panelClass: "card card-primary card-outline",
        title: "",
        paging: true,
        pageSize: 10,
        showingLabel: "Showing {0} of {1} records on page {2} of {3}.",
        canDelete: true,
        canEdit: true,
        canCreate: true,
        message: {
            errorTitle: "Error",
            errorOk: "Ok",
            confirmTitle: "Are you sure?",
            confirmDelete: "Are you sure to delete this records?",
            confirmOk: "Ok",
            confirmCancel: "Cancel"
        }
    };

    //TODO: Continue with the documentation
    self.fields = ko.observableArray([]);
    self.sorting = ko.observable(params && params.sorting);
    self.title = ko.observable((params && params.title) || self.defaults.title);
    self.paging = ko.observable((params && params.paging) || self.defaults.paging);
    self.pageSize = ko.observable((params && params.pageSize) || self.defaults.pageSize);
    self.panelClass = ko.observable((params && params.panelClass) || self.defaults.panelClass);
    self.showingLabel = ko.observable((params && params.showingLabel) || self.defaults.showingLabel);

    self.startIndex = ko.observable(0);
    self.records = ko.observableArray([]);
    self.totalRecordCount = ko.observable(0);

    self.listAction = ko.observable(params && params.listAction);
    self.createAction = ko.observable(params && params.createAction);
    self.updateAction = ko.observable(params && params.updateAction);
    self.deleteAction = ko.observable(params && params.deleteAction);
    self.actionForm = ko.observable("");

    self.canExport = ko.observable(params && params.canExport || false);
    self.canCreate = ko.observable((params && params.canCreate) || self.defaults.canCreate);
    self.canEdit = ko.observable((params && params.canEdit) || self.defaults.canEdit);
    self.canDelete = ko.observable((params && params.canDelete) || self.defaults.canDelete);

    self.isEditForm = ko.observable(false);

    self.frmTitle = ko.computed(function () {
        return self.isEditForm() ? "Edit record" : "Add new record";
    }, self);

    self.isLoading = ko.observable(false);
    self.searchFor = ko.observable("");

    self.currentPageIndex = ko.observable(0);

    self.maxPageIndex = ko.computed(function () {
        return Math.ceil(self.totalRecordCount() / self.pageSize()) - 1;

    }, self);

    self.caption = ko.computed(function () {
        return self.showingLabel().replace("{0}", self.records().length)
            .replace("{1}", self.totalRecordCount())
            .replace("{2}", self.currentPageIndex() + 1)
            .replace("{3}", self.maxPageIndex() + 1);
    }, self);

    self.currentPageIndex.subscribe(function (newValue) {
        self.startIndex(newValue * self.pageSize());
        self.Load();
    });

    self.totalFieldsCount = ko.computed(function () {
        let fieldCount = self.fields().length;
        if (self.canEdit()) {
            fieldCount++;
        }
        if (self.canDelete()) {
            fieldCount++;
        }
        return fieldCount;
    });

    //Methods
    self.Load = function () {
        self.isLoading(true);
        $.getJSON(self.listAction() + "?sorting=" + self.sorting() + "&startIndex=" + self.startIndex() + "&pageSize=" + self.pageSize()).done(function (data) {
            self.records.removeAll();
            self.totalRecordCount();

            if (data) {
                if (data.result === 0) {
                    self.totalRecordCount(data.totalRecordCount);
                    self.AddRecords(data.records);

                }
            }
            else {
                showToast("Something went wrong!", "error");
            }
            self.isLoading(false);
        });
    };

    self.ChangeDirection = function (field) {
        field.sortByDirection(field.sortBy() + 1);
        let order_by = field.dataMember();
        let sorting_exists = self.sorting().search(order_by) !== -1;
        let should_reload = false;

        switch (field.sortBy()) {
            case 1:
                if (sorting_exists)
                    self.sorting(self.sorting().replace(order_by + " DESC,", order_by + " ASC,"));
                else
                    self.sorting(self.sorting() + order_by + " ASC,");
                should_reload = true;

                break;
            case 2:
                if (sorting_exists)
                    self.sorting(self.sorting().replace(order_by + " ASC,", order_by + " DESC,"));
                else
                    self.sorting(self.sorting() + order_by + " DESC,");
                should_reload = true;
                break;
            default:
                self.sorting(self.sorting().replace(order_by + " ASC,", "").replace(order_by + " DESC,", ""));
                break;
        }
        if (should_reload) {
            self.Load();
        }

    };

    //Load columns
    ko.mapping.fromJS(params.fields, {
        create: function (opt) {
            return new koTableField(opt.data);
        }
    }, self.fields);

    //Set OrderBy
    $.each(self.fields(), function (i, field) {
        if (self.sorting().search(field.dataMember()) >= 0) {
            if (self.sorting().search(field.dataMember() + " ASC") >= 0) {
                field.sortByDirection(1);
            }
            else if (self.sorting().search(field.dataMember() + " DESC") >= 0) {
                field.sortByDirection(2);
            }
        }
    });

    /**
     * Allows to Add a new record manually
     * @param {koTableRow} record - The record to add using koTableRow definition.
     **/
    self.AddRecord = function (record) {
        self.records.push(new koTableRow(record));
    };

    /**
     *  Allows to Add a bunch of new records manually
     *  @param {Array} records - The records to add using koTableRow definition
     **/
    self.AddRecords = function (records) {
        ko.mapping.fromJS(records, {
            create: function (opt) {
                return new koTableRow(opt.data);
            }
        }, self.records);
    };
    /**
     * Deletes an specific row
     * @param {koTableRow} record - The record to remove using koTableRow definition.
     **/
    self.DeleteRecord = function (record) {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.value) {
                let keyValue = null;
                self.fields().forEach(field => {
                    if (field.key()) {
                        keyValue = record[field.dataMember()]();
                        return false;
                    }
                });
                executeAjax(self.deleteAction() + "/" + keyValue, "DELETE", null, function (data, textStatus, jqXHR) {
                    if (data.result !== undefined) {
                        if (data.result === 0 || data.result === "OK") {
                            showToast("Your record has been deleted.", "success");
                            self.Load();
                            return;
                        }
                    }
                    showToast("Something went wrong!", "error");
                    $(event.target).removeAttr("disabled");
                });
            }
        });
    };

    self.UpdateRecord = function (record) {
        self.fields().forEach(field => {
            field.value(record[field.dataMember()]());
        });

        showForm(true);
    };

    self.ShowCreateForm = function (data, event) {
        self.fields().forEach(field => {
            if (field.key()) {
                field.value(0);
            }
            else {
                field.value("");
            }
        });
        showForm(false);
    };

    let showForm = function (isEdit) {
        self.isEditForm(isEdit);

        let _modalDiv = $(event.target).closest(".card").find(".modal");
        _modalDiv.modal("show");

        $(_modalDiv).find("form").validate();
    };

    self.frmSave = function (data, event) {
        let _frm = $(event.target).closest(".modal").find("form");
        if (_frm.valid()) {
            _frm.submit(function (e) {
                $(event.target).attr("disabled", "disabled");
                let formData = {};
                $(this).serializeArray().forEach((v, k) => formData[v.name] = v.value);
                let postData = JSON.stringify(formData);
                let actionForm = self.isEditForm() === true ? self.updateAction() : self.createAction();
                let actionMethod = self.isEditForm() === true ? "PUT" : "POST";

                executeAjax(actionForm, actionMethod, postData, function (data, textStatus, jqXHR) {
                    if (data.result != undefined) {
                        if (data.result === 0 || data.result === "OK") {
                            showToast("Record saved", "success");
                            let _modalDiv = $(event.target).closest(".card").find(".modal");
                            _modalDiv.modal("hide");
                            self.Load();
                            $(event.target).removeAttr("disabled");
                            return;
                        }
                    }
                    showToast("Something went wrong!", "error");
                    $(event.target).removeAttr("disabled");
                },
                    function () {
                        showToast("Something went wrong!", "error");
                        $(event.target).removeAttr("disabled");
                    });
                e.preventDefault();
            });
            _frm.submit();
        }
    };

    let showToast = function (title, icon) {
        Swal.fire({
            toast: true,
            icon: icon,
            title: title,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            onOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer)
                toast.addEventListener('mouseleave', Swal.resumeTimer)
            }
        });
    };
    /**
     * Execute an AJAX Invocation.
     * @param {string} url - The URL to be used in the AJAX.
     * @param {string} type - The type of invocation: POST, GET, PUT, DELETE.
     * @param {object} postData - The data to be sent in the body.
     * @param {Function} onSuccess - The function definition for a successful execution.
     * @param {Function} onError - The function definition for a failed execution.
     **/
    let executeAjax = function (url, type, data, onSuccess, onError) {
        if (onError === null || onError === undefined || onError === 'undefined') {
            onError = function (jqXHR, textStatus, errorThrown) {
                showToast("Something went wrong! Please contact support", "error");
            };
        }

        if (!(type === "GET" || type === "POST" || type === "PUT" || type === "DELETE")) {
            showToast("Non implemented AJAX method: " + type, "error");
            return;
        }
        $.ajax({
            url: url,
            type: type,
            contentType: "application/json",
            data: data,
            success: onSuccess,
            error: onError
        });
    };
};
