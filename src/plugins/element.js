import Vue from 'vue';
import locale from 'element-ui/lib/locale';
import fr from 'element-ui/lib/locale/lang/fr';

// Element UI « à la carte » : seuls les composants réellement utilisés par
// l'application sont embarqués (~35 % de JavaScript en moins qu'avec
// `Vue.use(ElementUI)`). Pour utiliser un nouveau composant <el-xxx>, l'ajouter
// ici — sans quoi il s'affiche comme une balise vide.
import Alert from 'element-ui/lib/alert';
import Avatar from 'element-ui/lib/avatar';
import Button from 'element-ui/lib/button';
import Checkbox from 'element-ui/lib/checkbox';
import CollapseTransition from 'element-ui/lib/transitions/collapse-transition';
import DatePicker from 'element-ui/lib/date-picker';
import Dialog from 'element-ui/lib/dialog';
import Dropdown from 'element-ui/lib/dropdown';
import DropdownItem from 'element-ui/lib/dropdown-item';
import DropdownMenu from 'element-ui/lib/dropdown-menu';
import Form from 'element-ui/lib/form';
import FormItem from 'element-ui/lib/form-item';
import Input from 'element-ui/lib/input';
import InputNumber from 'element-ui/lib/input-number';
import Loading from 'element-ui/lib/loading';
import Menu from 'element-ui/lib/menu';
import MenuItem from 'element-ui/lib/menu-item';
import Message from 'element-ui/lib/message';
import MessageBox from 'element-ui/lib/message-box';
import Option from 'element-ui/lib/option';
import Pagination from 'element-ui/lib/pagination';
import Popconfirm from 'element-ui/lib/popconfirm';
import RadioButton from 'element-ui/lib/radio-button';
import RadioGroup from 'element-ui/lib/radio-group';
import Select from 'element-ui/lib/select';
import Switch from 'element-ui/lib/switch';
import TabPane from 'element-ui/lib/tab-pane';
import Table from 'element-ui/lib/table';
import TableColumn from 'element-ui/lib/table-column';
import Tabs from 'element-ui/lib/tabs';
import Tag from 'element-ui/lib/tag';
import Timeline from 'element-ui/lib/timeline';
import TimelineItem from 'element-ui/lib/timeline-item';
import Tooltip from 'element-ui/lib/tooltip';

locale.use(fr);

[
  Alert, Avatar, Button, Checkbox, DatePicker, Dialog, Dropdown, DropdownItem, DropdownMenu,
  Form, FormItem, Input, InputNumber, Menu, MenuItem, Option, Pagination, Popconfirm,
  RadioButton, RadioGroup, Select, Switch, TabPane, Table, TableColumn, Tabs, Tag,
  Timeline, TimelineItem, Tooltip,
].forEach((composant) => Vue.use(composant));
Vue.component(CollapseTransition.name, CollapseTransition);

// Directive v-loading et services globaux (this.$confirm, this.$alert…), comme
// le faisait Vue.use(ElementUI).
Vue.use(Loading.directive);
Vue.prototype.$ELEMENT = { size: '', zIndex: 2000 };
Vue.prototype.$loading = Loading.service;
Vue.prototype.$msgbox = MessageBox;
Vue.prototype.$alert = MessageBox.alert;
Vue.prototype.$confirm = MessageBox.confirm;
Vue.prototype.$prompt = MessageBox.prompt;
Vue.prototype.$message = Message;
