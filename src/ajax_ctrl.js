import { MetricsPanelCtrl } from 'app/plugins/sdk';
import _ from 'lodash';
import kbn from 'app/core/utils/kbn';
import TimeSeries from 'app/core/time_series';
import moment from 'moment';
import $ from 'jquery';
import './css/ajax-panel.css!';

const panelDefaults = {
    method: 'GET',
    url: 'https://raw.githubusercontent.com/ryantxu/ajax-panel/master/static/example.txt',
    errorMode: 'show',
    params_js: "{\n" +
        " from:ctrl.range.from.format('x'),  // x is unix ms timestamp\n" +
        " to:ctrl.range.to.format('x'), \n" +
        " height:ctrl.height\n" +
        "}",
    display_js: null
};

export class AjaxCtrl extends MetricsPanelCtrl {
    // constructor($scope, $injector, private templateSrv, private $sce) {
    constructor($scope, $injector, templateSrv, $sce, $http) {

        super($scope, $injector);
        this.$sce = $sce;
        this.$http = $http;
        this.templateSrv = templateSrv;

        _.defaults(this.panel, panelDefaults);
        _.defaults(this.panel.timeSettings, panelDefaults.timeSettings);

        this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
        this.events.on('panel-initialized', this.onPanelInitalized.bind(this));
        this.events.on('refresh', this.onRefresh.bind(this));
        this.events.on('render', this.onRender.bind(this));
        //this.events.on('parseParam', this.onParseParam.bind(this));
    }

    // This just skips trying to send the actual query.  perhaps there is a better way
    issueQueries(datasource) {
        this.updateTimeRange();

        console.log('block issueQueries', datasource);
    }

    onPanelInitalized() {
        this.updateFN();
    }

    onInitEditMode() {
        this.editorTabs.splice(1, 1); // remove the 'Metrics Tab'
        this.addEditorTab('Options', 'public/plugins/' + this.pluginId + '/editor.html', 1);
        this.editorTabIndex = 1;

        this.updateFN();
    }

    onPanelTeardown() {
        // this.$timeout.cancel(this.nextTickPromise);
    }

    updateFN() {
        this.params_fn = null;
        this.display_fn = null;

        if (this.panel.params_js) {
            try {
                this.params_fn = new Function('ctrl', 'return ' + this.panel.params_js);
            } catch (ex) {
                console.warn('error parsing params_js', this.panel.params_js, ex);
                this.params_fn = null;
            }
        }

        // NOTE, this is not exposed yet
        if (this.panel.display_js) {
            try {
                this.display_fn = new Function('ctrl', 'response', this.panel.display_js);
            } catch (ex) {
                console.warn('error parsing display_js', this.panel.display_js, ex);
                this.display_fn = null;
            }
        }

        this.onRefresh();
    }

    onParseParam(param, key) {
        var that = this;
        var paramStr = "";
        if (param.constructor == String || param.constructor == Number || param.constructor == Boolean) {
            paramStr += "&" + key + "=" + encodeURIComponent(param);
        } else {
            $.each(param, function(i) {
                var k = key == null ? i : key + (param instanceof Array ? "[" + i + "]" : "." + i);
                paramStr += '&' + that.onParseParam(this, k);
            });
        }
        return paramStr.substr(1);
    }

    onRefresh() {
        //console.log('refresh', this);
        this.updateTimeRange(); // needed for the first call

        var that = this;
        var params;
        if (this.params_fn) {
            params = this.params_fn(this);
        }


        var data, pageInfo, num, pageSize;
        var totalPage = 0,
            pageIndex = 1;

        function goPage(pno, psize) {
            var paramsData = {
                'method.name': 'mash5.task.queryFeeds',
                'method.optimize': 'fetchOne',
                'query.bo._id': '4f8d24b8632a848bd909b577@TGZ.Bo',
                'user.sessionId': '-5108224830335736294594b863fa7b11b00010bd76e',
                'page.curPage': pno,
                // 'query.bo.Fields.1.Value[]': '故障上报',
                //'query.bo.Fields.1.Value': '自动上报',
                'condition.$or': JSON.stringify([{ "bo.Fields.7.Value": "等待审核" }, { "bo.Fields.7.Value": "上报人已确认" }, { "bo.Fields.7.Value": "完成", "bo.Fields.11.Value.id": "57fcaf794dec600d30ae0bd1@0.User" }, { "bo.Fields.7.Value": "已批待完成", "bo.Fields.10.Value.id": "57fcaf794dec600d30ae0bd1@0.User" }, { "bo.Fields.7.Value": "因故搁置", "bo.Fields.10.Value.id": "57fcaf794dec600d30ae0bd1@0.User" }])
            };
            that.$http({
                method: that.panel.method,
                url: that.panel.url,
                headers: {
                    'Content-Type': "application/x-www-form-urlencoded; charset=UTF-8"
                },
                data: that.onParseParam(paramsData)
            }).then(function successCallback(response) {
                var html = response.data.object;

                data = html.nextData;
                pageInfo = html.pageInfo;
                num = pageInfo.total; //表格所有行数(所有记录数)  
                pageSize = pageInfo.perPageSize; //每页显示行数  

                //总共分几页   
                if (num / pageSize > parseInt(num / pageSize)) {
                    totalPage = parseInt(num / pageSize) + 1;
                } else {
                    totalPage = parseInt(num / pageSize);
                }

                var startPage = Math.max(pageIndex - 3, 1);
                var endPage = Math.max(pageSize, startPage + 9);

                if (endPage > totalPage) {
                    endPage = totalPage + 1;
                }
                var pageStr = $('<ul></ul>');
                for (var j = startPage; j < endPage; j++) {
                    var activeClass = j === pageIndex ? 'active' : '';
                    var liStr = $('<li><a class="table-panel-page-link pointer ' + activeClass + '">' + j + '</a></li>');
                    pageStr.append(liStr);
                }
                $('#table-page').empty().append(pageStr);

                that.updateContent(html.nextData);
                // that.onRender(html);
            }, function errorCallback(response) {
                console.warn('error', response);
                var body = '<h1>Error</h1><pre>' + JSON.stringify(response, null, " ") + "</pre>";
                that.updateContent(body);
            });
        }

        goPage(pageIndex, pageSize);
        $('#table-page').bind('click', 'li', function(e) {
            var el = $(e.target);
            pageIndex = parseInt(el.text());
            goPage(pageIndex, pageSize)
        });
    }

    onRender(html) {
        var that = this;
        var data = html.nextData;
        var pageInfo = html.pageInfo;
        var num = pageInfo.total; //表格所有行数(所有记录数)  

        var pageSize = pageInfo.perPageSize; //每页显示行数  
        var totalPage = 0;
        var pageIndex = 1;

        // //总共分几页   
        // if (num / pageSize > parseInt(num / pageSize)) {
        //     totalPage = parseInt(num / pageSize) + 1;
        // } else {
        //     totalPage = parseInt(num / pageSize);
        // }
        // var pageStr = $('<ul></ul>');
        // for (var j = 1; j <= totalPage; j++) {
        //     //   var activeClass = j === pageIndex ? 'active' : '';
        //     var liStr = $('<li><a class="table-panel-page-link pointer">' + j + '</a></li>');
        //     pageStr.append(liStr);
        // }
        // $('#table-page').empty().append(pageStr);
    }

    updateContent(html) {
        try {
            this.content = html;
        } catch (e) {
            console.log('Text panel error: ', e);
            this.content = JSON.stringify(html);
        }
    }

    //onRender() {
    //console.log('render', this);
    // }

}

AjaxCtrl.templateUrl = 'module.html';
