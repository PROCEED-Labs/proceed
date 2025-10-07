import CheckBoxOrRadioGroup from './CheckboxOrRadioGroup';
import Column from './Column';
import Container from './Container';
import Milestones, { ExportMilestones } from './Milestones';
import { EditImage, ExportImage } from './Image';
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

export const exportElements = { ExportInput };

export const specificElements = { EditImage, ExportImage, Milestones, ExportMilestones };
