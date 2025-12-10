import CheckBoxOrRadioGroup, { ExportCheckboxOrRadioGroup } from './CheckboxOrRadioGroup';
import Column from './Column';
import Container from './Container';
import Milestones, { ExportMilestones } from './Milestones';
import Input, { ExportInput } from './Input';
import Row from './Row';
import SubmitButton from './SubmitButton';
import Table from './Table';
import Text from './Text';

export const defaultElements = {
  Container,
  Row,
  Column,
  Text,
  Table,
  Input,
  SubmitButton,
  CheckBoxOrRadioGroup,
};

export const exportElements = {
  Input: ExportInput,
  CheckBoxOrRadioGroup: ExportCheckboxOrRadioGroup,
};

export const specificElements = { Milestones, ExportMilestones };
